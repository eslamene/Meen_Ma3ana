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
  
  // Home Appliances
  if (desc.includes('تلاجه') || desc.includes('غساله') || desc.includes('بوتاجاز') ||
      desc.includes('مروحه') || desc.includes('فريزر') || desc.includes('كولدير') ||
      desc.includes('دولاب') || desc.includes('شاشه') || desc.includes('سرير') ||
      desc.includes('جهاز') || desc.includes('أنبوبه') || desc.includes('ماكينه') ||
      desc.includes('خياطه') || desc.includes('اوفر') || desc.includes('موبايل')) {
    return 'appliances'
  }
  
  // Emergency Relief
  if (desc.includes('دين') || desc.includes('دين حالا') || desc.includes('غارمه') ||
      desc.includes('مطلقه') || desc.includes('أرمله') || desc.includes('أيتام') ||
      desc.includes('يتيم') || desc.includes('بتيم') || desc.includes('المتوفي') ||
      desc.includes('اكفان')) {
    return 'emergency'
  }
  
  // Livelihood & Business Support
  if (desc.includes('مشروع') || desc.includes('عربيه') || desc.includes('مقدم') ||
      desc.includes('موتوسيكل') || desc.includes('طيور') || desc.includes('زراعه')) {
    return 'livelihood'
  }
  
  // Social & Community Support
  if (desc.includes('جواز') || desc.includes('حلويات') || desc.includes('مولد') ||
      desc.includes('مسجد') || desc.includes('منبر') || desc.includes('سجاجيد') ||
      desc.includes('بنا') || desc.includes('تجديد') || desc.includes('افتتاح')) {
    return 'community'
  }
  
  // Basic Needs & Clothing
  if (desc.includes('بطاطين') || desc.includes('جواكت') || desc.includes('لعب') ||
      desc.includes('ميكب') || desc.includes('فساتين') || desc.includes('لبس') ||
      desc.includes('شتوي') || desc.includes('نيجيري')) {
    return 'basicneeds'
  }
  
  return 'other'
}

// Category name mappings
const categoryNames: Record<string, { en: string; ar: string }> = {
  medical: { en: 'Medical Support', ar: 'الدعم الطبي' },
  education: { en: 'Educational Assistance', ar: 'المساعدة التعليمية' },
  housing: { en: 'Housing & Rent', ar: 'السكن والإيجار' },
  appliances: { en: 'Home Appliances', ar: 'الأجهزة المنزلية' },
  emergency: { en: 'Emergency Relief', ar: 'الإغاثة الطارئة' },
  livelihood: { en: 'Livelihood & Business', ar: 'الدعم المعيشي والتجاري' },
  community: { en: 'Community & Social', ar: 'الدعم المجتمعي والاجتماعي' },
  basicneeds: { en: 'Basic Needs & Clothing', ar: 'الاحتياجات الأساسية والملابس' },
  other: { en: 'Other Support', ar: 'دعم آخر' },
}

const categoryDescriptions: Record<string, string> = {
  medical: 'Emergency medical expenses, treatments, medications, and ongoing care',
  education: 'School fees, supplies, tutoring, and educational support',
  housing: 'Rent assistance, housing repairs, and utility bills',
  appliances: 'Refrigerators, washing machines, stoves, and essential home appliances',
  emergency: 'Emergency support for widows, orphans, and families in crisis',
  livelihood: 'Business support, income generation projects, and livelihood assistance',
  community: 'Community infrastructure, social events, and community support',
  basicneeds: 'Clothing, blankets, toys, and basic necessities',
  other: 'Other forms of support and assistance',
}

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

export async function GET() {
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

    // 2. Calculate monthly breakdown from contributions
    const monthlyData = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${contributions.created_at})`,
        year: sql<number>`EXTRACT(YEAR FROM ${contributions.created_at})`,
        totalAmount: sum(contributions.amount),
        contributorCount: sql<number>`COUNT(DISTINCT ${contributions.donor_id})`,
        caseCount: sql<number>`COUNT(DISTINCT ${contributions.case_id})`,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.status, 'approved'),
          gte(contributions.created_at, new Date('2025-07-01')),
          lte(contributions.created_at, new Date('2025-11-30'))
        )
      )
      .groupBy(
        sql`EXTRACT(MONTH FROM ${contributions.created_at})`,
        sql`EXTRACT(YEAR FROM ${contributions.created_at})`
      )
      .orderBy(sql`EXTRACT(YEAR FROM ${contributions.created_at})`, sql`EXTRACT(MONTH FROM ${contributions.created_at})`)

    // Get all cases for category analysis
    const allCases = await db
      .select({
        id: cases.id,
        titleEn: cases.title_en,
        titleAr: cases.title_ar,
        description: cases.description_ar, // Use Arabic description for categorization
        descriptionAr: cases.description_ar,
        descriptionEn: cases.description_en,
        currentAmount: cases.current_amount,
        createdAt: cases.created_at,
      })
      .from(cases)
      .where(eq(cases.status, 'published'))

    // Calculate monthly breakdown with top categories
    const monthlyBreakdown = await Promise.all(
      monthlyData.map(async (month) => {
        const monthNum = Number(month.month)
        const monthInfo = monthNames[monthNum] || { en: `Month ${monthNum}`, ar: `شهر ${monthNum}` }
        
        // Get contributions for this month to find top category
        const monthContributions = await db
          .select({
            caseId: contributions.case_id,
            amount: contributions.amount,
          })
          .from(contributions)
          .where(
            and(
              eq(contributions.status, 'approved'),
              sql`EXTRACT(MONTH FROM ${contributions.created_at}) = ${monthNum}`,
              sql`EXTRACT(YEAR FROM ${contributions.created_at}) = ${Number(month.year)}`
            )
          )

        // Calculate top category for this month
        const categoryAmounts: Record<string, number> = {}
        const categoryCases: Record<string, Set<string>> = {}
        
        for (const contrib of monthContributions) {
          if (!contrib.caseId) continue
          const caseItem = allCases.find(c => c.id === contrib.caseId)
          if (!caseItem) continue
          
          const category = categorizeCase(caseItem.description || '')
          if (!categoryAmounts[category]) {
            categoryAmounts[category] = 0
            categoryCases[category] = new Set()
          }
          categoryAmounts[category] += Number(contrib.amount || 0)
          categoryCases[category].add(contrib.caseId)
        }

        const topCategoryKey = Object.entries(categoryAmounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other'
        const topCategoryInfo = categoryNames[topCategoryKey] || categoryNames.other

        return {
          month: monthNum,
          monthName: monthInfo.en,
          monthNameArabic: monthInfo.ar,
          totalCases: Number(month.caseCount) || 0,
          totalAmount: Number(month.totalAmount) || 0,
          totalAmountFormatted: formatAmount(Number(month.totalAmount) || 0),
          contributors: Number(month.contributorCount) || 0,
          topCategory: {
            name: topCategoryInfo.en,
            nameArabic: topCategoryInfo.ar,
            amount: categoryAmounts[topCategoryKey] || 0,
            cases: categoryCases[topCategoryKey]?.size || 0,
          },
        }
      })
    )

    // 3. Calculate category summary from cases
    const categoryMap: Record<string, {
      totalCases: number
      totalAmount: number
      cases: Array<{ id: string; amount: number }>
    }> = {}

    for (const caseItem of allCases) {
      const category = categorizeCase(caseItem.description || '')
      if (!categoryMap[category]) {
        categoryMap[category] = {
          totalCases: 0,
          totalAmount: 0,
          cases: [],
        }
      }
      const amount = Number(caseItem.currentAmount || 0)
      categoryMap[category].totalCases++
      categoryMap[category].totalAmount += amount
      categoryMap[category].cases.push({ id: caseItem.id, amount })
    }

    const categorySummary: Record<string, any> = {}
    for (const [category, data] of Object.entries(categoryMap)) {
      const categoryInfo = categoryNames[category] || categoryNames.other
      categorySummary[category] = {
        name: categoryInfo.en,
        nameArabic: categoryInfo.ar,
        totalCases: data.totalCases,
        totalAmount: data.totalAmount,
        totalAmountFormatted: formatAmount(data.totalAmount),
        averagePerCase: data.totalCases > 0 ? Math.round(data.totalAmount / data.totalCases) : 0,
        description: categoryDescriptions[category] || '',
      }
    }

    // 4. Get success stories from top cases by category
    const topMedicalCase = allCases
      .filter(c => categorizeCase(c.description || '') === 'medical')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]

    const topEducationCase = allCases
      .filter(c => categorizeCase(c.description || '') === 'education')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]

    const topHousingCase = allCases
      .filter(c => categorizeCase(c.description || '') === 'housing')
      .sort((a, b) => Number(b.currentAmount || 0) - Number(a.currentAmount || 0))[0]

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
    console.error('Error fetching impact data from database:', error)
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
