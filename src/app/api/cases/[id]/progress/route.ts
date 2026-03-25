import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { ContributionService } from '@/lib/services/contributionService'
import { CaseService } from '@/lib/services/caseService'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const caseId = params.id

  let targetAmount: number | null
  try {
    targetAmount = await CaseService.getCaseTargetAmount(supabase, caseId)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'failed to fetch case target amount', { error: e, caseId })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch case progress', 500)
  }

  if (targetAmount === null) {
    throw new ApiError('NOT_FOUND', 'Case not found', 404)
  }

  let progress
  try {
    progress = await ContributionService.getCaseProgress(supabase, caseId)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'failed to fetch case progress stats', { error: e, caseId })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch case progress', 500)
  }

  const progressPercentage =
    targetAmount > 0 ? Math.min((progress.approvedTotal / targetAmount) * 100, 100) : 0

  return NextResponse.json({
    approvedTotal: progress.approvedTotal,
    contributorCount: progress.contributorCount,
    progressPercentage,
  })
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: false,
  loggerContext: 'api/cases/[id]/progress',
})
