import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { db } from '@/lib/db'
import { cases, contributions, caseCategories, users, caseStatuses, type CaseStatus } from '@/drizzle/schema'
import { eq, and, desc, sql, sum, count, avg, gte, lte } from 'drizzle-orm'
import { defaultLogger as logger } from '@/lib/logger'

interface CasePerformanceReport {
  caseId: string
  title: string
  category: string | null
  status: string
  targetAmount: string
  currentAmount: string
  progressPercentage: number
  totalContributions: number
  averageContribution: string
  firstContributionDate: string | null
  lastContributionDate: string | null
  daysActive: number | null
  completionRate: number
  createdBy: string | null
  createdAt: string
}

function isValidCaseStatus(status: string | null): status is CaseStatus {
  return status !== null && caseStatuses.includes(status as CaseStatus)
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const sortBy = searchParams.get('sortBy') || 'currentAmount'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build conditions
    const conditions = []
    if (status && isValidCaseStatus(status)) {
      conditions.push(eq(cases.status, status))
    }
    if (categoryId) {
      conditions.push(eq(cases.category_id, categoryId))
    }

    // Fetch cases with their contribution statistics
    const casesQuery = db
      .select({
        caseId: cases.id,
        titleEn: cases.title_en,
        titleAr: cases.title_ar,
        categoryName: caseCategories.name,
        status: cases.status,
        targetAmount: cases.target_amount,
        currentAmount: cases.current_amount,
        createdAt: cases.created_at,
        createdByEmail: users.email,
        totalContributions: count(contributions.id),
        totalAmount: sum(contributions.amount),
        averageContribution: avg(contributions.amount),
        firstContributionDate: sql<string>`MIN(${contributions.created_at})`,
        lastContributionDate: sql<string>`MAX(${contributions.created_at})`,
      })
      .from(cases)
      .leftJoin(caseCategories, eq(cases.category_id, caseCategories.id))
      .leftJoin(users, eq(cases.created_by, users.id))
      .leftJoin(contributions, eq(contributions.case_id, cases.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        cases.id,
        cases.title_en,
        cases.title_ar,
        caseCategories.name,
        cases.status,
        cases.target_amount,
        cases.current_amount,
        cases.created_at,
        users.email
      )

    // Apply sorting
    if (sortBy === 'currentAmount') {
      casesQuery.orderBy(sortOrder === 'desc' ? desc(cases.current_amount) : cases.current_amount)
    } else if (sortBy === 'totalContributions') {
      casesQuery.orderBy(sortOrder === 'desc' ? desc(count(contributions.id)) : count(contributions.id))
    } else if (sortBy === 'progress') {
      casesQuery.orderBy(
        sortOrder === 'desc'
          ? desc(sql`(${cases.current_amount} / NULLIF(${cases.target_amount}, 0)) * 100`)
          : sql`(${cases.current_amount} / NULLIF(${cases.target_amount}, 0)) * 100`
      )
    } else {
      casesQuery.orderBy(desc(cases.created_at))
    }

    casesQuery.limit(limit).offset(offset)

    const casesData = await casesQuery

    // Transform data
    const reports: CasePerformanceReport[] = casesData.map((c) => {
      const target = parseFloat(c.targetAmount?.toString() || '0')
      const current = parseFloat(c.currentAmount?.toString() || '0')
      const progressPercentage = target > 0 ? Math.round((current / target) * 100) : 0
      const totalContribs = Number(c.totalContributions) || 0
      const avgContrib = c.averageContribution ? parseFloat(c.averageContribution.toString()) : 0

      // Calculate days active
      let daysActive: number | null = null
      if (c.firstContributionDate) {
        const firstDate = new Date(c.firstContributionDate)
        const lastDate = c.lastContributionDate ? new Date(c.lastContributionDate) : new Date()
        daysActive = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Calculate completion rate (percentage of target reached)
      const completionRate = target > 0 ? Math.min(100, progressPercentage) : 0

      return {
        caseId: c.caseId,
        title: c.titleEn || c.titleAr || 'Untitled Case',
        category: c.categoryName || null,
        status: c.status || 'draft',
        targetAmount: target.toFixed(2),
        currentAmount: current.toFixed(2),
        progressPercentage,
        totalContributions: totalContribs,
        averageContribution: avgContrib.toFixed(2),
        firstContributionDate: c.firstContributionDate || null,
        lastContributionDate: c.lastContributionDate || null,
        daysActive,
        completionRate,
        createdBy: c.createdByEmail || null,
        createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
      }
    })

    // Get total count
    const totalCountQuery = db
      .select({
        count: sql<number>`count(distinct ${cases.id})`,
      })
      .from(cases)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const totalCountResult = await totalCountQuery
    const totalCount = totalCountResult[0]?.count || 0

    return NextResponse.json({
      cases: reports,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    logger.error('Error fetching case performance reports:', error)
    return NextResponse.json({ error: 'Failed to fetch case performance reports' }, { status: 500 })
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/reports/cases',
})

