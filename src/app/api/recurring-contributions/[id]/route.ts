import { NextRequest, NextResponse } from 'next/server'
import { createPatchHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

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

    // Verify the contribution belongs to the user
    const { data: existingContrib, error: fetchError } = await supabase
      .from('recurring_contributions')
      .select('donor_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingContrib) {
      throw new ApiError('NOT_FOUND', 'Recurring contribution not found', 404)
    }

    if (existingContrib.donor_id !== user.id) {
      throw new ApiError('FORBIDDEN', 'You can only update your own recurring contributions', 403)
    }

    // Determine new status based on action or direct status
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

    // Validate status values
    const validStatuses = ['active', 'paused', 'cancelled', 'completed']
    if (!validStatuses.includes(newStatus)) {
      throw new ApiError('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    }

    // Update the contribution
    const { data: updatedContrib, error: updateError } = await supabase
      .from('recurring_contributions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating recurring contribution', { error: updateError })
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update recurring contribution: ${updateError.message}`, 500)
    }

    return NextResponse.json(updatedContrib)
}

export const PATCH = createPatchHandlerWithParams(patchHandler, { 
  requireAuth: true, 
  loggerContext: 'api/recurring-contributions/[id]' 
})
