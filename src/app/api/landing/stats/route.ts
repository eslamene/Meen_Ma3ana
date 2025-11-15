import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cases, contributions, caseCategories } from '@/drizzle/schema'
import { eq, and, sql, countDistinct } from 'drizzle-orm'
import { categorizeCase } from '@/lib/utils/category-detection'

export async function GET() {
  try {
    // Calculate stats directly from cases and contributions tables
    // Get total raised from ALL approved contributions (no date filter)
    // Use SQL directly to ensure proper decimal handling
    const totalRaisedResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${contributions.amount}::numeric), 0)`
      })
      .from(contributions)
      .where(eq(contributions.status, 'approved'))
    
    // Convert to number - drizzle sum with decimal returns string, SQL returns number
    const totalRaised = Number(totalRaisedResult[0]?.total || 0)
    
    // Get active cases count (published cases)
    const activeCasesResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cases)
      .where(eq(cases.status, 'published'))
    
    const activeCases = Number(activeCasesResult[0]?.count || 0)
    
    // Get beneficiaries count (same as active cases for now, one case = one beneficiary)
    const beneficiaries = activeCases
    
    // Get unique contributors count from ALL approved contributions
    const contributorsResult = await db
      .select({ count: countDistinct(contributions.donor_id) })
      .from(contributions)
      .where(eq(contributions.status, 'approved'))
    
    const contributors = Number(contributorsResult[0]?.count || 0)
    
    // Get story-specific stats from top cases by category
    const allCases = await db
      .select({
        id: cases.id,
        titleEn: cases.title_en,
        titleAr: cases.title_ar,
        descriptionAr: cases.description_ar,
        descriptionEn: cases.description_en,
        currentAmount: cases.current_amount,
      })
      .from(cases)
      .where(eq(cases.status, 'published'))
    
    // Get categories to match by ID - use specific IDs from database
    const allCategories = await db.select().from(caseCategories).where(eq(caseCategories.is_active, true))
    
    // Find medical, education, and housing categories by ID or name pattern
    const medicalCategory = allCategories.find(c => 
      c.id === '034662d0-00ef-41fc-bfbf-90db9c7499dd' ||
      (c.name || '').toLowerCase().includes('medical') || 
      (c.name || '').toLowerCase().includes('طبي')
    )
    const educationCategory = allCategories.find(c => 
      c.id === '449ca259-a73d-4edf-b000-9bbd91c89973' ||
      (c.name || '').toLowerCase().includes('education') || 
      (c.name || '').toLowerCase().includes('تعليم')
    )
    const housingCategory = allCategories.find(c => 
      c.id === '39db1de3-6f6c-474a-a656-0d12affbd4f5' ||
      (c.name || '').toLowerCase().includes('housing') || 
      (c.name || '').toLowerCase().includes('سكن') ||
      (c.name || '').toLowerCase().includes('ايجار')
    )
    
    // Categorize all cases using database rules (async)
    const categorizedCases = await Promise.all(
      allCases.map(async (c) => ({
        ...c,
        detectedCategoryId: await categorizeCase(c.descriptionAr || ''),
      }))
    )
    
    // Find top medical case
    const topMedicalCase = medicalCategory
      ? categorizedCases
          .filter(c => c.detectedCategoryId === medicalCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null
    
    // Find top education case
    const topEducationCase = educationCategory
      ? categorizedCases
          .filter(c => c.detectedCategoryId === educationCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null
    
    // Find top housing case
    const topHousingCase = housingCategory
      ? categorizedCases
          .filter(c => c.detectedCategoryId === housingCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null
    
    // Get contributor counts for featured stories
    const getContributorCount = async (caseId: string) => {
      if (!caseId) return 0
      const result = await db
        .select({ count: countDistinct(contributions.donor_id) })
        .from(contributions)
        .where(
          and(
            eq(contributions.case_id, caseId),
            eq(contributions.status, 'approved')
          )
        )
      return Number(result[0]?.count || 0)
    }
    
    // Calculate story stats
    const storyMedicalRaised = topMedicalCase ? Number(topMedicalCase.currentAmount || 0) : 0
    const storyEducationStudents = topEducationCase ? await getContributorCount(topEducationCase.id) : 0
    const storyHousingFamilies = topHousingCase ? await getContributorCount(topHousingCase.id) : 0
    
    // Return stats calculated from real data
    return NextResponse.json({
      totalRaised,
      activeCases,
      beneficiaries,
      contributors,
      storyMedicalRaised,
      storyEducationStudents,
      storyHousingFamilies,
    })
  } catch (error) {
    console.error('Error fetching landing stats:', error)
    // Return defaults if there's an error
    return NextResponse.json(
      {
        totalRaised: 0,
        activeCases: 0,
        beneficiaries: 0,
        contributors: 0,
        storyMedicalRaised: 0,
        storyEducationStudents: 0,
        storyHousingFamilies: 0,
      },
      { status: 500 }
    )
  }
}

