import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { db } from '@/lib/db'
import { contributions, paymentMethodsTable } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm'
import { defaultLogger as logger } from '@/lib/logger'

interface PaymentMethodReport {
  methodId: string
  methodName: string
  methodCode: string
  totalAmount: string
  totalContributions: number
  averageAmount: string
  approvedAmount: string
  approvedContributions: number
  pendingAmount: string
  pendingContributions: number
  rejectedAmount: string
  rejectedContributions: number
  successRate: number
  isActive: boolean
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dateRange = searchParams.get('dateRange') || 'all'

    // Calculate date range
    let fromDate: Date | null = null
    let toDate: Date = new Date()

    if (dateRange !== 'all') {
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
          }
          break
      }
    }

    const dateConditions = fromDate
      ? [gte(contributions.created_at, fromDate), lte(contributions.created_at, toDate)]
      : []

    // Fetch payment method statistics
    const paymentMethodStats = await db
      .select({
        methodId: paymentMethodsTable.id,
        methodName: paymentMethodsTable.name,
        methodCode: paymentMethodsTable.code,
        isActive: paymentMethodsTable.is_active,
        totalAmount: sum(contributions.amount),
        totalContributions: count(contributions.id),
        averageAmount: avg(contributions.amount),
        approvedAmount: sum(sql`CASE WHEN ${contributions.status} = 'approved' THEN ${contributions.amount} ELSE 0 END`),
        approvedContributions: count(sql`CASE WHEN ${contributions.status} = 'approved' THEN 1 END`),
        pendingAmount: sum(sql`CASE WHEN ${contributions.status} = 'pending' THEN ${contributions.amount} ELSE 0 END`),
        pendingContributions: count(sql`CASE WHEN ${contributions.status} = 'pending' THEN 1 END`),
        rejectedAmount: sum(sql`CASE WHEN ${contributions.status} = 'rejected' THEN ${contributions.amount} ELSE 0 END`),
        rejectedContributions: count(sql`CASE WHEN ${contributions.status} = 'rejected' THEN 1 END`),
      })
      .from(paymentMethodsTable)
      .leftJoin(contributions, eq(contributions.payment_method_id, paymentMethodsTable.id))
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .groupBy(
        paymentMethodsTable.id,
        paymentMethodsTable.name,
        paymentMethodsTable.code,
        paymentMethodsTable.is_active
      )
      .orderBy(desc(sum(contributions.amount)))

    const reports: PaymentMethodReport[] = paymentMethodStats.map((pm) => {
      const totalContribs = Number(pm.totalContributions) || 0
      const approvedContribs = Number(pm.approvedContributions) || 0
      const successRate = totalContribs > 0 ? Math.round((approvedContribs / totalContribs) * 100) : 0

      return {
        methodId: pm.methodId,
        methodName: pm.methodName || 'Unknown',
        methodCode: pm.methodCode || 'unknown',
        totalAmount: (parseFloat(pm.totalAmount?.toString() || '0')).toFixed(2),
        totalContributions: totalContribs,
        averageAmount: (parseFloat(pm.averageAmount?.toString() || '0')).toFixed(2),
        approvedAmount: (parseFloat(pm.approvedAmount?.toString() || '0')).toFixed(2),
        approvedContributions: approvedContribs,
        pendingAmount: (parseFloat(pm.pendingAmount?.toString() || '0')).toFixed(2),
        pendingContributions: Number(pm.pendingContributions) || 0,
        rejectedAmount: (parseFloat(pm.rejectedAmount?.toString() || '0')).toFixed(2),
        rejectedContributions: Number(pm.rejectedContributions) || 0,
        successRate,
        isActive: pm.isActive || false,
      }
    })

    return NextResponse.json({
      paymentMethods: reports,
      dateRange: {
        from: fromDate?.toISOString() || null,
        to: toDate.toISOString(),
      },
    })
  } catch (error) {
    logger.error('Error fetching payment method reports:', error)
    return NextResponse.json({ error: 'Failed to fetch payment method reports' }, { status: 500 })
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/reports/payment-methods',
})

