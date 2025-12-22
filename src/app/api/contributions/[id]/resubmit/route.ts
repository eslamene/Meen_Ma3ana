import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const body = await request.json()
    const { reply } = body

    if (!reply || !reply.trim()) {
      throw new ApiError('VALIDATION_ERROR', 'Reply is required', 400)
    }

    // Verify the contribution belongs to the current user
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .select('id, donor_id, case_id')
      .eq('id', id)
      .single()

    if (contributionError || !contribution) {
      throw new ApiError('NOT_FOUND', 'Contribution not found', 404)
    }

    if (contribution.donor_id !== user.id) {
      throw new ApiError('FORBIDDEN', 'You can only resubmit your own contributions', 403)
    }

    // Get the current approval status
    const { data: approvalStatus, error: approvalError } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', id)
      .single()

    if (approvalError || !approvalStatus) {
      throw new ApiError('NOT_FOUND', 'Approval status not found', 404)
    }

    if (approvalStatus.status !== 'rejected') {
      throw new ApiError('VALIDATION_ERROR', 'Only rejected contributions can be resubmitted', 400)
    }

    // Update the approval status with the donor reply and increment resubmission count
    const { error: updateError } = await supabase
      .from('contribution_approval_status')
      .update({
        donor_reply: reply.trim(),
        donor_reply_date: new Date().toISOString(),
        resubmission_count: (approvalStatus.resubmission_count || 0) + 1,
        status: 'pending', // Reset to pending for admin review
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalStatus.id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating approval status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update resubmission' },
        { status: 500 }
      )
    }

    // Create notification for admins about the resubmission
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          type: 'contribution_resubmitted',
          recipient_id: admin.id,
          title: 'Contribution Resubmitted',
          message: `A contribution has been resubmitted for review. Please check the updated information.`,
          data: {
            contribution_id: id,
            case_id: contribution.case_id,
            donor_reply: reply.trim()
          }
        }))

        await supabase.from('notifications').insert(notifications)
      }
    } catch (notificationError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating notifications:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Resubmission sent successfully'
    })
}

export const POST = createPostHandlerWithParams<{ id: string }>(handler, { requireAuth: true, loggerContext: 'api/contributions/[id]/resubmit' }) 