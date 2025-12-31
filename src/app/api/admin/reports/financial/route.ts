import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { db } from '@/lib/db'
import { contributions, paymentMethodsTable } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm'
import { defaultLogger as logger } from '@/lib/logger'

interface FinancialSummary {
  totalAmount: string
  totalContributions: number
  averageContribution: string
  approvedAmount: string
  approvedContributions: number
  pendingAmount: string
  pendingContributions: number
  rejectedAmount: string
  rejectedContributions: number
  paymentMethodBreakdown: Array<{
    methodName: string
    methodCode: string
    totalAmount: string
    totalContributions: number
    averageAmount: string
  }>
  dailyTrends: Array<{
    date: string
    amount: string
    count: number
  }>
  monthlyTrends: Array<{
    month: string
    amount: string
    count: number
  }>
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dateRange = searchParams.get('dateRange') || 'last30Days'

    // Calculate date range
    let fromDate: Date
    let toDate: Date = new Date()

    switch (dateRange) {
      case 'last7Days':
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last30Days':
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last90Days':
        fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'lastYear':
        fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'customRange':
        if (startDate && endDate) {
          fromDate = new Date(startDate)
          toDate = new Date(endDate)
        } else {
          fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
        break
      default:
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    const dateConditions = [gte(contributions.created_at, fromDate), lte(contributions.created_at, toDate)]

    // Overall statistics
    const overallStats = await db
      .select({
        totalAmount: sum(contributions.amount),
        totalContributions: count(contributions.id),
        averageContribution: avg(contributions.amount),
        approvedAmount: sum(sql`CASE WHEN ${contributions.status} = 'approved' THEN ${contributions.amount} ELSE 0 END`),
        approvedContributions: count(sql`CASE WHEN ${contributions.status} = 'approved' THEN 1 END`),
        pendingAmount: sum(sql`CASE WHEN ${contributions.status} = 'pending' THEN ${contributions.amount} ELSE 0 END`),
        pendingContributions: count(sql`CASE WHEN ${contributions.status} = 'pending' THEN 1 END`),
        rejectedAmount: sum(sql`CASE WHEN ${contributions.status} = 'rejected' THEN ${contributions.amount} ELSE 0 END`),
        rejectedContributions: count(sql`CASE WHEN ${contributions.status} = 'rejected' THEN 1 END`),
      })
      .from(contributions)
      .where(and(...dateConditions))

    // Payment method breakdown
    const paymentMethodStats = await db
      .select({
        methodName: paymentMethodsTable.name,
        methodCode: paymentMethodsTable.code,
        totalAmount: sum(contributions.amount),
        totalContributions: count(contributions.id),
        averageAmount: avg(contributions.amount),
      })
      .from(contributions)
      .innerJoin(paymentMethodsTable, eq(contributions.payment_method_id, paymentMethodsTable.id))
      .where(and(...dateConditions))
      .groupBy(paymentMethodsTable.id, paymentMethodsTable.name, paymentMethodsTable.code)
      .orderBy(desc(sum(contributions.amount)))

    // Daily trends
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${contributions.created_at})`,
        amount: sum(contributions.amount),
        count: count(contributions.id),
      })
      .from(contributions)
      .where(and(...dateConditions))
      .groupBy(sql`DATE(${contributions.created_at})`)
      .orderBy(sql`DATE(${contributions.created_at})`)

    // Monthly trends
    const monthlyTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${contributions.created_at}, 'YYYY-MM')`,
        amount: sum(contributions.amount),
        count: count(contributions.id),
      })
      .from(contributions)
      .where(and(...dateConditions))
      .groupBy(sql`TO_CHAR(${contributions.created_at}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${contributions.created_at}, 'YYYY-MM')`)

    const stats = overallStats[0] || {}
    const summary: FinancialSummary = {
      totalAmount: (parseFloat(stats.totalAmount?.toString() || '0')).toFixed(2),
      totalContributions: Number(stats.totalContributions) || 0,
      averageContribution: (parseFloat(stats.averageContribution?.toString() || '0')).toFixed(2),
      approvedAmount: (parseFloat(stats.approvedAmount?.toString() || '0')).toFixed(2),
      approvedContributions: Number(stats.approvedContributions) || 0,
      pendingAmount: (parseFloat(stats.pendingAmount?.toString() || '0')).toFixed(2),
      pendingContributions: Number(stats.pendingContributions) || 0,
      rejectedAmount: (parseFloat(stats.rejectedAmount?.toString() || '0')).toFixed(2),
      rejectedContributions: Number(stats.rejectedContributions) || 0,
      paymentMethodBreakdown: paymentMethodStats.map((pm) => ({
        methodName: pm.methodName || 'Unknown',
        methodCode: pm.methodCode || 'unknown',
        totalAmount: (parseFloat(pm.totalAmount?.toString() || '0')).toFixed(2),
        totalContributions: Number(pm.totalContributions) || 0,
        averageAmount: (parseFloat(pm.averageAmount?.toString() || '0')).toFixed(2),
      })),
      dailyTrends: dailyTrends.map((dt) => ({
        date: dt.date,
        amount: (parseFloat(dt.amount?.toString() || '0')).toFixed(2),
        count: Number(dt.count) || 0,
      })),
      monthlyTrends: monthlyTrends.map((mt) => ({
        month: mt.month,
        amount: (parseFloat(mt.amount?.toString() || '0')).toFixed(2),
        count: Number(mt.count) || 0,
      })),
    }

    return NextResponse.json({
      summary,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    })
  } catch (error) {
    logger.error('Error fetching financial summary:', error)
    return NextResponse.json({ error: 'Failed to fetch financial summary' }, { status: 500 })
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/reports/financial',
})

