import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { RecurringContributionService } from '@/lib/services/recurringContributionService'

/**
 * GET /api/recurring-contributions
 * Fetch recurring contributions for the authenticated user
 * Returns contributions with joined case and project data
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user } = context

  const rows = await RecurringContributionService.listForDonorWithCaseProject(supabase, user.id)
  const transformedContributions = RecurringContributionService.transformForListResponse(rows)

  interface TransformedContribution {
    status: string
  }
  const total = transformedContributions.length
  const active = transformedContributions.filter((c: TransformedContribution) => c.status === 'active').length
  const paused = transformedContributions.filter((c: TransformedContribution) => c.status === 'paused').length
  const cancelled = transformedContributions.filter((c: TransformedContribution) => c.status === 'cancelled').length
  const completed = transformedContributions.filter((c: TransformedContribution) => c.status === 'completed').length

  return NextResponse.json({
    contributions: transformedContributions,
    aggregates: {
      total,
      active,
      paused,
      cancelled,
      completed
    }
  })
}

/**
 * POST /api/recurring-contributions
 * Create a new recurring contribution
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { caseId, projectId, amount, frequency, startDate, endDate, paymentMethod, autoProcess, notes } = body

  if (!amount || amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'Amount must be greater than 0', 400)
  }

  if (!frequency || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Invalid frequency. Must be one of: weekly, monthly, quarterly, yearly',
      400
    )
  }

  if (!startDate) {
    throw new ApiError('VALIDATION_ERROR', 'Start date is required', 400)
  }

  const start = new Date(startDate)
  const nextContributionDate = new Date(start)

  switch (frequency) {
    case 'weekly':
      nextContributionDate.setDate(start.getDate() + 7)
      break
    case 'monthly':
      nextContributionDate.setMonth(start.getMonth() + 1)
      break
    case 'quarterly':
      nextContributionDate.setMonth(start.getMonth() + 3)
      break
    case 'yearly':
      nextContributionDate.setFullYear(start.getFullYear() + 1)
      break
  }

  try {
    const contribution = await RecurringContributionService.create(supabase, user.id, {
      caseId: caseId || null,
      projectId: projectId || null,
      amount: parseFloat(amount),
      frequency,
      startDate,
      endDate: endDate || null,
      nextContributionDate: nextContributionDate.toISOString(),
      paymentMethod: paymentMethod || 'bank_transfer',
      autoProcess: autoProcess !== undefined ? autoProcess : true,
      notes: notes || null
    })

    return NextResponse.json(contribution, { status: 201 })
  } catch (e) {
    logger.error('Error creating recurring contribution', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create recurring contribution', 500, {
      details: e instanceof Error ? e.message : String(e)
    })
  }
}

export const GET = createGetHandler(getHandler, { requireAuth: true, loggerContext: 'api/recurring-contributions' })
export const POST = createPostHandler(postHandler, { requireAuth: true, loggerContext: 'api/recurring-contributions' })
