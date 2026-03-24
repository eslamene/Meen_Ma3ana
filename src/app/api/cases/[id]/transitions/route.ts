import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseLifecycleService } from '@/lib/case-lifecycle'
import type { CaseStatus } from '@/drizzle/schema'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, supabase, logger } = context
  const { id: caseId } = params

  try {
    const { CaseService } = await import('@/lib/services/caseService')
    const { UserService } = await import('@/lib/services/userService')

    // Get case details
    const caseData = await CaseService.getById(supabase, caseId)
    
    if (!caseData) {
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    // Get user role
    const userData = await UserService.getById(supabase, user.id)
    const userRole = userData?.role || 'donor'

    // Get available transitions
    const availableTransitions = CaseLifecycleService.getAvailableTransitions(
      caseData.status as CaseStatus,
      userRole,
      false
    )

    return NextResponse.json({ transitions: availableTransitions })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case transitions:', { error, caseId })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch transitions', 500)
  }
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/transitions' 
}) 