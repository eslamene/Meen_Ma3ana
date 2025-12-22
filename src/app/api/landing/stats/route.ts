import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cases, contributions, caseCategories, landingStats } from '@/drizzle/schema'
import { eq, and, sql, countDistinct, inArray } from 'drizzle-orm'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

// Cache duration: 5 minutes (stats don't need to be real-time)
export const revalidate = 300

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    // OPTIMIZATION: Read from cached landing_stats table first (instant!)
    const cachedStats = await db
      .select()
      .from(landingStats)
      .where(
        inArray(landingStats.statKey, [
          'total_raised',
          'active_cases',
          'beneficiaries',
          'contributors',
          'story_medical_raised',
          'story_education_students',
          'story_housing_families',
        ])
      )

    // Convert cached stats to a map for quick lookup
    const statsMap = new Map(
      cachedStats.map((stat) => [stat.statKey, Number(stat.statValue)])
    )

    // Check if cache is fresh (updated within last 5 minutes)
    const cacheAge = cachedStats.length > 0
      ? Math.max(...cachedStats.map((s) => s.updatedAt ? new Date(s.updatedAt).getTime() : 0))
      : 0
    const cacheAgeMinutes = (Date.now() - cacheAge) / (1000 * 60)
    const isCacheFresh = cacheAgeMinutes < 5 && cachedStats.length >= 4

    // If cache is fresh, return immediately (blazing fast!)
    if (isCacheFresh) {
      const response = NextResponse.json({
        totalRaised: statsMap.get('total_raised') || 0,
        activeCases: statsMap.get('active_cases') || 0,
        beneficiaries: statsMap.get('beneficiaries') || 0,
        contributors: statsMap.get('contributors') || 0,
        storyMedicalRaised: statsMap.get('story_medical_raised') || 0,
        storyEducationStudents: statsMap.get('story_education_students') || 0,
        storyHousingFamilies: statsMap.get('story_housing_families') || 0,
      })

      // Add caching headers for Next.js and browser
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      
      return response
    }

    // Cache is stale or missing - calculate fresh stats in parallel
    // OPTIMIZATION: Run all main queries in parallel
    const [totalRaisedResult, activeCasesResult, contributorsResult, allCategories] = await Promise.all([
      // Total raised
      db
        .select({ 
          total: sql<number>`COALESCE(SUM(${contributions.amount}::numeric), 0)`
        })
        .from(contributions)
        .where(eq(contributions.status, 'approved')),
      
      // Active cases count
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cases)
        .where(eq(cases.status, 'published')),
      
      // Unique contributors count
      db
        .select({ count: countDistinct(contributions.donor_id) })
        .from(contributions)
        .where(eq(contributions.status, 'approved')),
      
      // Categories (needed for story stats)
      db
        .select()
        .from(caseCategories)
        .where(eq(caseCategories.is_active, true)),
    ])

    const totalRaised = Number(totalRaisedResult[0]?.total || 0)
    const activeCases = Number(activeCasesResult[0]?.count || 0)
    const beneficiaries = activeCases // Same as active cases for now
    const contributors = Number(contributorsResult[0]?.count || 0)

    // OPTIMIZATION: Calculate story stats only if needed (lazy evaluation)
    // Use SQL to find top cases by category directly (much faster than fetching all)
    const medicalCategoryId = '034662d0-00ef-41fc-bfbf-90db9c7499dd'
    const educationCategoryId = '449ca259-a73d-4edf-b000-9bbd91c89973'
    const housingCategoryId = '39db1de3-6f6c-474a-a656-0d12affbd4f5'

    // Get top cases by category using SQL (single query per category)
    const [topMedicalCase, topEducationCase, topHousingCase] = await Promise.all([
      db
        .select({
          id: cases.id,
          currentAmount: cases.current_amount,
        })
        .from(cases)
        .where(
          and(
            eq(cases.status, 'published'),
            eq(cases.category_id, medicalCategoryId)
          )
        )
        .orderBy(sql`${cases.current_amount} DESC`)
        .limit(1),
      
      db
        .select({
          id: cases.id,
          currentAmount: cases.current_amount,
        })
        .from(cases)
        .where(
          and(
            eq(cases.status, 'published'),
            eq(cases.category_id, educationCategoryId)
          )
        )
        .orderBy(sql`${cases.current_amount} DESC`)
        .limit(1),
      
      db
        .select({
          id: cases.id,
          currentAmount: cases.current_amount,
        })
        .from(cases)
        .where(
          and(
            eq(cases.status, 'published'),
            eq(cases.category_id, housingCategoryId)
          )
        )
        .orderBy(sql`${cases.current_amount} DESC`)
        .limit(1),
    ])

    // Get contributor counts for featured stories in parallel
    const [storyMedicalRaised, storyEducationStudents, storyHousingFamilies] = await Promise.all([
      Promise.resolve(topMedicalCase[0] ? Number(topMedicalCase[0].currentAmount || 0) : 0),
      
      topEducationCase[0]?.id
        ? db
            .select({ count: countDistinct(contributions.donor_id) })
            .from(contributions)
            .where(
              and(
                eq(contributions.case_id, topEducationCase[0].id),
                eq(contributions.status, 'approved')
              )
            )
            .then((r) => Number(r[0]?.count || 0))
        : Promise.resolve(0),
      
      topHousingCase[0]?.id
        ? db
            .select({ count: countDistinct(contributions.donor_id) })
            .from(contributions)
            .where(
              and(
                eq(contributions.case_id, topHousingCase[0].id),
                eq(contributions.status, 'approved')
              )
            )
            .then((r) => Number(r[0]?.count || 0))
        : Promise.resolve(0),
    ])

    // Update cache asynchronously (don't wait for it) using raw SQL for reliability
    const updateCache = async () => {
      try {
        // Use raw SQL for upsert (INSERT ... ON CONFLICT DO UPDATE)
        await db.execute(sql`
          INSERT INTO landing_stats (stat_key, stat_value, updated_at)
          VALUES 
            ('total_raised', ${totalRaised.toString()}::numeric, NOW()),
            ('active_cases', ${activeCases.toString()}::numeric, NOW()),
            ('beneficiaries', ${beneficiaries.toString()}::numeric, NOW()),
            ('contributors', ${contributors.toString()}::numeric, NOW()),
            ('story_medical_raised', ${storyMedicalRaised.toString()}::numeric, NOW()),
            ('story_education_students', ${storyEducationStudents.toString()}::numeric, NOW()),
            ('story_housing_families', ${storyHousingFamilies.toString()}::numeric, NOW())
          ON CONFLICT (stat_key) 
          DO UPDATE SET 
            stat_value = EXCLUDED.stat_value,
            updated_at = NOW()
        `)
      } catch (error) {
        // Log but don't fail the request
        logger.error('Error updating cache:', { error: error })
      }
    }

    // Update cache in background (non-blocking)
    updateCache().catch(() => {})

    const response = NextResponse.json({
      totalRaised,
      activeCases,
      beneficiaries,
      contributors,
      storyMedicalRaised,
      storyEducationStudents,
      storyHousingFamilies,
    })

    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    logger.error('Error fetching landing stats:', { error: error })
    
    // Try to return cached values even on error
    const cachedStats = await db
      .select()
      .from(landingStats)
      .where(
        inArray(landingStats.statKey, [
          'total_raised',
          'active_cases',
          'beneficiaries',
          'contributors',
          'story_medical_raised',
          'story_education_students',
          'story_housing_families',
        ])
      )
      .catch(() => [])

    const statsMap = new Map(
      cachedStats.map((stat) => [stat.statKey, Number(stat.statValue)])
    )

    return NextResponse.json(
      {
        totalRaised: statsMap.get('total_raised') || 0,
        activeCases: statsMap.get('active_cases') || 0,
        beneficiaries: statsMap.get('beneficiaries') || 0,
        contributors: statsMap.get('contributors') || 0,
        storyMedicalRaised: statsMap.get('story_medical_raised') || 0,
        storyEducationStudents: statsMap.get('story_education_students') || 0,
        storyHousingFamilies: statsMap.get('story_housing_families') || 0,
      },
      { status: 200 } // Return 200 even on error if we have cache
    )
  }
}

export const GET = withApiHandler(handler, { loggerContext: 'api/landing/stats' })

