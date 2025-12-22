import { NextRequest, NextResponse } from 'next/server'
import { db, client } from '@/lib/db'
import { cases, contributions, caseCategories } from '@/drizzle/schema'
import { eq, and, sql, sum, countDistinct, gte, lte } from 'drizzle-orm'
import { categorizeCase } from '@/lib/utils/category-detection'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

// Month name mappings
const monthNames: Record<number, { en: string; ar: string }> = {
  1: { en: 'January', ar: 'يناير' },
  2: { en: 'February', ar: 'فبراير' },
  3: { en: 'March', ar: 'مارس' },
  4: { en: 'April', ar: 'أبريل' },
  5: { en: 'May', ar: 'مايو' },
  6: { en: 'June', ar: 'يونيو' },
  7: { en: 'July', ar: 'يوليو' },
  8: { en: 'August', ar: 'أغسطس' },
  9: { en: 'September', ar: 'سبتمبر' },
  10: { en: 'October', ar: 'أكتوبر' },
  11: { en: 'November', ar: 'نوفمبر' },
  12: { en: 'December', ar: 'ديسمبر' },
}

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    // Calculate all stats directly from cases and contributions tables
    const startDate = new Date('2025-07-01')
    const endDate = new Date('2025-11-30')
    
    // Get total raised from approved contributions
    const totalRaisedResult = await db
      .select({ total: sum(contributions.amount) })
      .from(contributions)
      .where(
        and(
          eq(contributions.status, 'approved'),
          gte(contributions.created_at, startDate),
          lte(contributions.created_at, endDate)
        )
      )
    
    const totalRaised = Number(totalRaisedResult[0]?.total || 0)
    
    // Get active cases count (published cases)
    const activeCasesResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cases)
      .where(eq(cases.status, 'published'))
    
    const activeCases = Number(activeCasesResult[0]?.count || 0)
    
    // Get beneficiaries count (same as active cases for now, one case = one beneficiary)
    const beneficiaries = activeCases
    
    // Get unique contributors count
    const contributorsResult = await db
      .select({ count: countDistinct(contributions.donor_id) })
      .from(contributions)
      .where(
        and(
          eq(contributions.status, 'approved'),
          gte(contributions.created_at, startDate),
          lte(contributions.created_at, endDate)
        )
      )
    
    const contributors = Number(contributorsResult[0]?.count || 0)
    
    // Build ourImpact object from calculated data
    const ourImpact = {
      totalRaised,
      totalRaisedFormatted: formatAmount(totalRaised),
      totalRaisedDisplay: totalRaised.toLocaleString(),
      activeCases,
      beneficiariesHelped: beneficiaries,
      contributors,
      metrics: [
        {
          label: 'Total Raised',
          value: formatAmount(totalRaised),
          fullValue: totalRaised,
          currency: 'EGP',
        },
        {
          label: 'Active Cases',
          value: String(activeCases),
          fullValue: activeCases,
        },
        {
          label: 'Beneficiaries Helped',
          value: String(beneficiaries),
          fullValue: beneficiaries,
        },
        {
          label: 'Contributors',
          value: String(contributors),
          fullValue: contributors,
        },
      ],
    }

    // 2. Get monthly breakdown from database view
    const monthlyBreakdownData = await client`
      SELECT 
        month,
        year,
        total_cases,
        total_amount,
        contributors,
        top_category_name_en,
        top_category_name_ar,
        top_category_id,
        top_category_amount,
        top_category_cases
      FROM monthly_breakdown_view
      ORDER BY year DESC, month DESC
    `

    // Transform the view data to match the expected format
    // Ensure monthlyBreakdownData is an array before mapping
    const monthlyBreakdown = (Array.isArray(monthlyBreakdownData) ? monthlyBreakdownData : []).map((row) => {
      const monthNum = Number(row.month)
      const yearNum = Number(row.year)
      const monthInfo = monthNames[monthNum] || { en: `Month ${monthNum}`, ar: `شهر ${monthNum}` }
      
      return {
        month: monthNum,
        year: yearNum,
        monthName: monthInfo.en,
        monthNameArabic: monthInfo.ar,
        totalCases: Number(row.total_cases) || 0,
        totalAmount: Number(row.total_amount) || 0,
        totalAmountFormatted: formatAmount(Number(row.total_amount) || 0),
        contributors: Number(row.contributors) || 0,
        topCategory: {
          name: row.top_category_name_en || 'Other Support',
          nameArabic: row.top_category_name_ar || 'دعم آخر',
          amount: Number(row.top_category_amount) || 0,
          cases: Number(row.top_category_cases) || 0,
        },
      }
    })

    // 3. Get category summary from database view
    const categorySummaryData = await client`
      SELECT 
        category_id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        icon,
        color,
        total_cases,
        total_amount,
        average_per_case
      FROM category_summary_view
      WHERE total_cases > 0
      ORDER BY total_amount DESC
    `

    // Transform the view data to match the expected format
    // Ensure categorySummaryData is an array before iterating
    interface CategorySummaryItem {
      name?: string
      nameArabic?: string
      totalCases?: number
      totalAmount?: number
      totalAmountFormatted?: string
      averagePerCase?: number
      description?: string
      descriptionAr?: string
      icon?: string
      color?: string
    }
    const categorySummary: Record<string, CategorySummaryItem> = {}
    const safeCategoryData = Array.isArray(categorySummaryData) ? categorySummaryData : []
    for (const row of safeCategoryData) {
      // Use category_id as key, or generate a slug from name_en
      const categoryKey = (row.name_en as string)?.toLowerCase().replace(/\s+/g, '').replace(/&/g, '') || `category_${row.category_id}`
      
      categorySummary[categoryKey] = {
        name: row.name_en || '',
        nameArabic: row.name_ar || '',
        totalCases: Number(row.total_cases) || 0,
        totalAmount: Number(row.total_amount) || 0,
        totalAmountFormatted: formatAmount(Number(row.total_amount) || 0),
        averagePerCase: Number(row.average_per_case) || 0,
        description: row.description_en || '',
        descriptionAr: row.description_ar || '',
        icon: row.icon || '',
        color: row.color || '',
      }
    }

    // 4. Get success stories from top cases by category (using actual category_id)
    const allCases = await db
      .select({
        id: cases.id,
        titleEn: cases.title_en,
        titleAr: cases.title_ar,
        descriptionAr: cases.description_ar,
        descriptionEn: cases.description_en,
        currentAmount: cases.current_amount,
        createdAt: cases.created_at,
        categoryId: cases.category_id,
      })
      .from(cases)
      .where(eq(cases.status, 'published'))

    // Get categories to match by category_id
    const categories = await db.select().from(caseCategories).where(eq(caseCategories.is_active, true))
    const medicalCategory = categories.find(c => 
      (c.name || '').toLowerCase().includes('medical')
    )
    const educationCategory = categories.find(c => 
      (c.name || '').toLowerCase().includes('education')
    )
    const housingCategory = categories.find(c => 
      (c.name || '').toLowerCase().includes('housing')
    )

    // Get top cases by actual category_id, fallback to text matching if category not found
    const topMedicalCaseByCategory = medicalCategory 
      ? allCases
          .filter(c => c.categoryId === medicalCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null

    const topEducationCaseByCategory = educationCategory
      ? allCases
          .filter(c => c.categoryId === educationCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null

    const topHousingCaseByCategory = housingCategory
      ? allCases
          .filter(c => c.categoryId === housingCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      : null

    // Use the category-based results, fallback to database rules if needed
    let topMedicalCase = topMedicalCaseByCategory
    let topEducationCase = topEducationCaseByCategory
    let topHousingCase = topHousingCaseByCategory

    // If category-based matching didn't find cases, use database rules
    if (!topMedicalCase || !topEducationCase || !topHousingCase) {
      // Categorize all cases using database rules
      const categorizedCases = await Promise.all(
        allCases.map(async (c) => ({
          ...c,
          detectedCategoryId: await categorizeCase(c.descriptionAr || ''),
        }))
      )

      if (!topMedicalCase && medicalCategory) {
        topMedicalCase = categorizedCases
          .filter(c => c.detectedCategoryId === medicalCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      }

      if (!topEducationCase && educationCategory) {
        topEducationCase = categorizedCases
          .filter(c => c.detectedCategoryId === educationCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      }

      if (!topHousingCase && housingCategory) {
        topHousingCase = categorizedCases
          .filter(c => c.detectedCategoryId === housingCategory.id)
          .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]
      }
    }

    // Get contributor counts for featured stories
    const getContributorCount = async (caseId: string) => {
      if (!caseId) return 0
      const result = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${contributions.donor_id})` })
        .from(contributions)
        .where(
          and(
            eq(contributions.case_id, caseId),
            eq(contributions.status, 'approved')
          )
        )
      return Number(result[0]?.count || 0)
    }

    // Build featured stories with contributor counts
    const featuredStoriesArray = []
    
    if (topMedicalCase) {
      const contributors = await getContributorCount(topMedicalCase.id)
      featuredStoriesArray.push({
        id: 'medical-1',
        category: 'medical',
        title: topMedicalCase.titleEn || 'Emergency Medical Support',
        titleAr: topMedicalCase.titleAr || 'دعم طبي طارئ',
        description: topMedicalCase.descriptionEn || 'Helped cover medical expenses',
        descriptionAr: topMedicalCase.descriptionAr || '',
        amount: Number(topMedicalCase.currentAmount || 0),
        amountFormatted: `${Number(topMedicalCase.currentAmount || 0).toLocaleString()} EGP`,
        amountDisplay: Number(topMedicalCase.currentAmount || 0).toLocaleString(),
        contributors,
        month: monthNames[new Date(topMedicalCase.createdAt.toString()).getMonth() + 1]?.en || 'Recent',
        beneficiaries: 1,
      })
    }

    if (topEducationCase) {
      const contributors = await getContributorCount(topEducationCase.id)
      featuredStoriesArray.push({
        id: 'education-1',
        category: 'education',
        title: topEducationCase.titleEn || 'Educational Assistance',
        titleAr: topEducationCase.titleAr || 'المساعدة التعليمية',
        description: topEducationCase.descriptionEn || 'Supported students with educational needs',
        descriptionAr: topEducationCase.descriptionAr || '',
        amount: Number(topEducationCase.currentAmount || 0),
        amountFormatted: `${Number(topEducationCase.currentAmount || 0).toLocaleString()} EGP`,
        amountDisplay: Number(topEducationCase.currentAmount || 0).toLocaleString(),
        contributors,
        month: monthNames[new Date(topEducationCase.createdAt).getMonth() + 1]?.en || 'Recent',
        studentsHelped: 1,
      })
    }

    if (topHousingCase) {
      const contributors = await getContributorCount(topHousingCase.id)
      featuredStoriesArray.push({
        id: 'housing-1',
        category: 'housing',
        title: topHousingCase.titleEn || 'Housing Support',
        titleAr: topHousingCase.titleAr || 'دعم سكني',
        description: topHousingCase.descriptionEn || 'Provided housing assistance for families in need',
        descriptionAr: topHousingCase.descriptionAr || '',
        amount: Number(topHousingCase.currentAmount || 0),
        amountFormatted: `${Number(topHousingCase.currentAmount || 0).toLocaleString()} EGP`,
        amountDisplay: Number(topHousingCase.currentAmount || 0).toLocaleString(),
        contributors,
        month: monthNames[new Date(topHousingCase.createdAt).getMonth() + 1]?.en || 'Recent',
        familiesHelped: 1,
      })
    }

    // Build byCategory stories
    const medicalContributors = topMedicalCase ? await getContributorCount(topMedicalCase.id) : 0
    const educationContributors = topEducationCase ? await getContributorCount(topEducationCase.id) : 0
    const housingContributors = topHousingCase ? await getContributorCount(topHousingCase.id) : 0

    const successStories = {
      featured: featuredStoriesArray,
      byCategory: {
        medical: topMedicalCase ? [{
          id: topMedicalCase.id,
          title: topMedicalCase.titleEn || 'Emergency Medical Support',
          titleAr: topMedicalCase.titleAr || 'دعم طبي طارئ',
          description: topMedicalCase.descriptionEn || 'Helped cover medical expenses',
          descriptionAr: topMedicalCase.descriptionAr || '',
          amount: Number(topMedicalCase.currentAmount || 0),
          amountFormatted: `${Number(topMedicalCase.currentAmount || 0).toLocaleString()} EGP`,
          contributors: medicalContributors,
          month: monthNames[new Date(topMedicalCase.createdAt.toString()).getMonth() + 1]?.en || 'Recent',
        }] : [],
        education: topEducationCase ? [{
          id: topEducationCase.id,
          title: topEducationCase.titleEn || 'Educational Assistance',
          titleAr: topEducationCase.titleAr || 'المساعدة التعليمية',
          description: topEducationCase.descriptionEn || 'Supported students with educational needs',
          descriptionAr: topEducationCase.descriptionAr || '',
          amount: Number(topEducationCase.currentAmount || 0),
          amountFormatted: `${Number(topEducationCase.currentAmount || 0).toLocaleString()} EGP`,
          contributors: educationContributors,
          month: monthNames[new Date(topEducationCase.createdAt.toString()).getMonth() + 1]?.en || 'Recent',
        }] : [],
        housing: topHousingCase ? [{
          id: topHousingCase.id,
          title: topHousingCase.titleEn || 'Housing Support',
          titleAr: topHousingCase.titleAr || 'دعم سكني',
          description: topHousingCase.descriptionEn || 'Provided housing assistance',
          descriptionAr: topHousingCase.descriptionAr || '',
          amount: Number(topHousingCase.currentAmount || 0),
          amountFormatted: `${Number(topHousingCase.currentAmount || 0).toLocaleString()} EGP`,
          contributors: housingContributors,
          month: monthNames[new Date(topHousingCase.createdAt.toString()).getMonth() + 1]?.en || 'Recent',
        }] : [],
      },
    }

    return NextResponse.json({
      ourImpact,
      successStories,
      monthlyBreakdown,
      categorySummary,
    })
  } catch (error) {
    logger.error('Error fetching impact data from database:', { error: error })
    return NextResponse.json(
      { error: 'Failed to fetch impact data' },
      { status: 500 }
    )
  }
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M+`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K+`
  }
  return amount.toLocaleString()
}

export const GET = withApiHandler(handler, { loggerContext: 'api/landing/impact' })
