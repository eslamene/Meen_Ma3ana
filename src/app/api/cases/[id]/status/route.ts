import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPatchHandlerWithParams, createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseLifecycleService } from '@/lib/case-lifecycle'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { logger } = context
  const { id: caseId } = params

  // Get case status history
  const historyResult = await CaseLifecycleService.getCaseStatusHistory(caseId)
  
  if (!historyResult.success) {
    throw new ApiError('INTERNAL_SERVER_ERROR', historyResult.error || 'Failed to get case status history', 500)
  }

  return NextResponse.json({ history: historyResult.history })
}

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, logger } = context
  const { id: caseId } = params
  const body = await request.json()
  const { newStatus, changeReason, systemTriggered = false } = body

  // Change case status
  const result = await CaseLifecycleService.changeCaseStatus({
    caseId,
    newStatus,
    changedBy: user.id,
    systemTriggered,
    changeReason
  })

  if (!result.success) {
    throw new ApiError('VALIDATION_ERROR', result.error || 'Failed to change case status', 400)
  }

  return NextResponse.json({ case: result.case })
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id: caseId } = params
  const body = await request.json()
  const { action } = body

  if (action === 'check-automatic-closure') {
    // Check if case should be automatically closed
    const result = await checkAndCloseCaseIfFullyFunded(supabase, caseId)
    return NextResponse.json(result)
  }

  throw new ApiError('VALIDATION_ERROR', 'Invalid action', 400)
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/status' 
})

export const PATCH = createPatchHandlerWithParams(patchHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/status' 
})

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/status' 
})

async function checkAndCloseCaseIfFullyFunded(supabase: SupabaseClient, caseId: string) {
  try {
    const { CaseService } = await import('@/lib/services/caseService')
    const { ContributionService } = await import('@/lib/services/contributionService')

    // Get case details
    const caseData = await CaseService.getById(supabase, caseId)

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Only check one-time cases that are published
    if (caseData.type !== 'one-time' || caseData.status !== 'published') {
      return { success: false, error: 'Case is not eligible for automatic closure' }
    }

    // Get all contributions for this case to calculate total
    const contributionsResult = await ContributionService.getContributions(supabase, {
      limit: 10000, // Get all contributions
      page: 1,
      offset: 0
    })

    // Filter contributions for this case and sum amounts
    const caseContributions = contributionsResult.contributions.filter(c => c.caseId === caseId)
    const totalAmount = caseContributions.reduce((sum, c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
      return sum + amount
    }, 0)

    const targetAmount = parseFloat(caseData.target_amount?.toString() || '0')

    // Check if case is fully funded
    if (totalAmount >= targetAmount) {
      // Automatically close the case
      const result = await CaseLifecycleService.changeCaseStatus({
        caseId,
        newStatus: 'closed',
        systemTriggered: true,
        changeReason: 'Case automatically closed - funding goal reached'
      })

      if (result.success) {
        return {
          success: true,
          message: 'Case automatically closed due to full funding',
          case: result.case
        }
      } else {
        return { success: false, error: result.error }
      }
    } else {
      return {
        success: true,
        message: 'Case not yet fully funded',
        currentAmount: totalAmount,
        targetAmount: targetAmount,
        remainingAmount: targetAmount - totalAmount
      }
    }
  } catch (error) {
    // This is a helper function, not a route handler, so we use defaultLogger
    const { defaultLogger } = await import('@/lib/logger')
    defaultLogger.error('Error checking automatic closure', { error })
    return { success: false, error: 'Failed to check automatic closure' }
  }
} 