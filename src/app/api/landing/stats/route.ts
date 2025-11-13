import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cases, contributions } from '@/drizzle/schema'
import { eq, and, sql, sum, countDistinct, gte, lte } from 'drizzle-orm'

// Helper function to categorize case by description
function categorizeCase(description: string): string {
  if (!description) return 'other'
  
  const desc = description.toLowerCase()
  
  // Medical Support
  if (desc.includes('مريض') || desc.includes('دوا') || desc.includes('أدويه') || 
      desc.includes('علاج') || desc.includes('عمليه') || desc.includes('كانسر') ||
      desc.includes('مستشفي') || desc.includes('أشعه') || desc.includes('سنان') ||
      desc.includes('ضروس') || desc.includes('قلب') || desc.includes('حروق') ||
      desc.includes('روماتيزم') || desc.includes('تخاطب') || desc.includes('جلسات') ||
      desc.includes('سكر')) {
    return 'medical'
  }
  
  // Educational Assistance
  if (desc.includes('مدرسه') || desc.includes('مدارس') || desc.includes('دروس') ||
      desc.includes('تعليم') || desc.includes('مصاريف مدرس') || desc.includes('لاب توب') ||
      desc.includes('هندسه') || desc.includes('ثانويه') || desc.includes('طلبه') ||
      desc.includes('أزهر') || desc.includes('شباب الأزهر')) {
    return 'education'
  }
  
  // Housing & Rent
  if (desc.includes('ايجار') || desc.includes('إيجار') || desc.includes('بيت') ||
      desc.includes('شقه') || desc.includes('سقف') || desc.includes('ارضيه') ||
      desc.includes('مرتبه') || desc.includes('كهربا') || desc.includes('كهرباء') ||
      desc.includes('سباكه') || desc.includes('حمام')) {
    return 'housing'
  }
  
  return 'other'
}

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
    
    // Find top medical case
    const topMedicalCase = allCases
      .filter(c => categorizeCase(c.descriptionAr || '') === 'medical')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
    
    // Find top education case
    const topEducationCase = allCases
      .filter(c => categorizeCase(c.descriptionAr || '') === 'education')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
    
    // Find top housing case
    const topHousingCase = allCases
      .filter(c => categorizeCase(c.descriptionAr || '') === 'housing')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
    
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

