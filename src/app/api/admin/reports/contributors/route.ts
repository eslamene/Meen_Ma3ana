import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { db } from '@/lib/db'
import { contributions, cases, users, paymentMethodsTable } from '@/drizzle/schema'
import { eq, and, desc, sql, sum, count } from 'drizzle-orm'
import { defaultLogger as logger } from '@/lib/logger'

interface ContributorReport {
  donorId: string
  donorName: string
  donorEmail: string
  donorPhone: string | null
  totalContributions: number
  totalAmount: string
  contributions: Array<{
    id: string
    amount: string
    status: string
    createdAt: string
    caseId: string | null
    caseTitle: string | null
    paymentMethod: string | null
    anonymous: boolean
    notes: string | null
  }>
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build base query conditions
    const conditions = []
    if (caseId) {
      conditions.push(eq(contributions.case_id, caseId))
    }
    if (status) {
      conditions.push(eq(contributions.status, status))
    }

    // Fetch contributors with their contributions
    // First, get all unique donors with their contribution stats
    const contributorsQuery = db
      .select({
        donorId: users.id,
        donorFirstName: users.first_name,
        donorLastName: users.last_name,
        donorEmail: users.email,
        donorPhone: users.phone,
        totalAmount: sum(contributions.amount),
        totalContributions: count(contributions.id),
      })
      .from(contributions)
      .innerJoin(users, eq(contributions.donor_id, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(users.id, users.first_name, users.last_name, users.email, users.phone)
      .orderBy(desc(sum(contributions.amount)))
      .limit(limit)
      .offset(offset)

    const contributors = await contributorsQuery

    // If search is provided, filter contributors by name or email
    let filteredContributors = contributors
    if (search) {
      const searchLower = search.toLowerCase()
      filteredContributors = contributors.filter(
        (c) =>
          (c.donorFirstName && c.donorFirstName.toLowerCase().includes(searchLower)) ||
          (c.donorLastName && c.donorLastName.toLowerCase().includes(searchLower)) ||
          (c.donorEmail && c.donorEmail.toLowerCase().includes(searchLower))
      )
    }

    // For each contributor, fetch their detailed contributions
    const contributorReports: ContributorReport[] = await Promise.all(
      filteredContributors.map(async (contributor) => {
        const contributionConditions = [eq(contributions.donor_id, contributor.donorId)]
        if (caseId) {
          contributionConditions.push(eq(contributions.case_id, caseId))
        }
        if (status) {
          contributionConditions.push(eq(contributions.status, status))
        }

        // Fetch detailed contributions for this contributor
        const contributorContributions = await db
          .select({
            id: contributions.id,
            amount: contributions.amount,
            status: contributions.status,
            createdAt: contributions.created_at,
            caseId: contributions.case_id,
            anonymous: contributions.anonymous,
            notes: contributions.notes,
            caseTitleEn: cases.title_en,
            caseTitleAr: cases.title_ar,
            paymentMethodName: paymentMethodsTable.name,
            paymentMethodCode: paymentMethodsTable.code,
          })
          .from(contributions)
          .leftJoin(cases, eq(contributions.case_id, cases.id))
          .leftJoin(paymentMethodsTable, eq(contributions.payment_method_id, paymentMethodsTable.id))
          .where(and(...contributionConditions))
          .orderBy(desc(contributions.created_at))

        return {
          donorId: contributor.donorId,
          donorName: `${contributor.donorFirstName || ''} ${contributor.donorLastName || ''}`.trim() || contributor.donorEmail || 'Unknown',
          donorEmail: contributor.donorEmail || '',
          donorPhone: contributor.donorPhone || null,
          totalContributions: Number(contributor.totalContributions) || 0,
          totalAmount: contributor.totalAmount?.toString() || '0',
          contributions: contributorContributions.map((c) => ({
            id: c.id,
            amount: c.amount?.toString() || '0',
            status: c.status || 'pending',
            createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
            caseId: c.caseId || null,
            caseTitle: c.caseTitleEn || c.caseTitleAr || null,
            paymentMethod: c.paymentMethodName || c.paymentMethodCode || null,
            anonymous: c.anonymous || false,
            notes: c.notes || null,
          })),
        }
      })
    )

    // Get total count for pagination
    const totalCountQuery = db
      .select({
        count: sql<number>`count(distinct ${users.id})`,
      })
      .from(contributions)
      .innerJoin(users, eq(contributions.donor_id, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const totalCountResult = await totalCountQuery
    const totalCount = totalCountResult[0]?.count || 0

    return NextResponse.json({
      contributors: contributorReports,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
      logger.error('Error fetching contributor reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributor reports' },
      { status: 500 }
    )
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/reports/contributors',
})

