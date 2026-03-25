import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { ContributionService } from '@/lib/services/contributionService'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const caseId = params.id

  let totalAmount: number
  try {
    totalAmount = await ContributionService.sumAmountsForCaseAllStatuses(supabase, caseId)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'contributions sum failed', { error: e, caseId })
    throw new ApiError('INTERNAL_SERVER_ERROR', e instanceof Error ? e.message : 'Failed to sum contributions', 500)
  }

  return NextResponse.json({ totalAmount })
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: true,
  requirePermissions: ['contributions:read'],
  loggerContext: 'api/cases/[id]/contributions-sum',
})
