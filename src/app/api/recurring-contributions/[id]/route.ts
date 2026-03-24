import { NextRequest, NextResponse } from 'next/server'
import { createPatchHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { RecurringContributionService } from '@/lib/services/recurringContributionService'

/**
 * PATCH /api/recurring-contributions/[id]
 * Update a recurring contribution (e.g., status changes for pause/resume/cancel)
 */
async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, user, logger } = context
  const { id } = params

  const body = await request.json()
  const { status, action } = body

  const existingContrib = await RecurringContributionService.getByIdForDonor(supabase, id, user.id)

  if (!existingContrib) {
    throw new ApiError('NOT_FOUND', 'Recurring contribution not found', 404)
  }

  let newStatus = status
  if (action === 'pause') {
    newStatus = 'paused'
  } else if (action === 'resume') {
    newStatus = 'active'
  } else if (action === 'cancel') {
    newStatus = 'cancelled'
  }

  if (!newStatus) {
    throw new ApiError('VALIDATION_ERROR', 'Status or action is required', 400)
  }

  const validStatuses = ['active', 'paused', 'cancelled', 'completed']
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
  }

  try {
    const updatedContrib = await RecurringContributionService.updateStatus(supabase, id, newStatus)
    return NextResponse.json(updatedContrib)
  } catch (e) {
    logger.error('Error updating recurring contribution', { error: e })
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      `Failed to update recurring contribution: ${e instanceof Error ? e.message : String(e)}`,
      500
    )
  }
}

export const PATCH = createPatchHandlerWithParams(patchHandler, {
  requireAuth: true,
  loggerContext: 'api/recurring-contributions/[id]'
})
