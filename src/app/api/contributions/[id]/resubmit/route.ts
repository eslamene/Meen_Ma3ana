import { NextRequest, NextResponse } from 'next/server'
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

  try {
    const { ContributionService } = await import('@/lib/services/contributionService')
    const { NotificationService } = await import('@/lib/services/notificationService')

    // Verify the contribution belongs to the current user
    const contribution = await ContributionService.getById(supabase, id)

    if (!contribution) {
      throw new ApiError('NOT_FOUND', 'Contribution not found', 404)
    }

    if (contribution.donorId !== user.id) {
      throw new ApiError('FORBIDDEN', 'You can only resubmit your own contributions', 403)
    }

    // Get the current approval status
    const approvalStatusArray = contribution.approval_status || []
    const latestApprovalStatus = approvalStatusArray[0]

    if (!latestApprovalStatus) {
      throw new ApiError('NOT_FOUND', 'Approval status not found', 404)
    }

    if (latestApprovalStatus.status !== 'rejected') {
      throw new ApiError('VALIDATION_ERROR', 'Only rejected contributions can be resubmitted', 400)
    }

    // Update the approval status with the donor reply and increment resubmission count
    // Note: We need to get the approval status ID first
    try {
      const { data: approvalStatusData } = await supabase
        .from('contribution_approval_status')
        .select('id')
        .eq('contribution_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!approvalStatusData) {
        throw new ApiError('NOT_FOUND', 'Approval status record not found', 404)
      }

      const { error: updateError } = await supabase
        .from('contribution_approval_status')
        .update({
          donor_reply: reply.trim(),
          donor_reply_date: new Date().toISOString(),
          resubmission_count: (latestApprovalStatus.resubmission_count || 0) + 1,
          status: 'pending', // Reset to pending for admin review
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalStatusData.id)

      if (updateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating approval status:', updateError)
        throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update resubmission', 500)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating approval status:', { error })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update resubmission', 500)
    }

    // Create notification for admins about the resubmission
    try {
      // Get admin users
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(100) // Limit to prevent too many notifications

      if (admins && admins.length > 0) {
        // Create notifications using NotificationService
        await Promise.all(
          admins.map(admin =>
            NotificationService.create(supabase, {
              recipient_id: admin.id,
              type: 'contribution_resubmitted',
              title: 'Contribution Resubmitted',
              message: `A contribution has been resubmitted for review. Please check the updated information.`,
              data: {
                contribution_id: id,
                case_id: contribution.caseId,
                donor_reply: reply.trim()
              }
            }).catch(err => {
              logger.warn('Error creating notification for admin (non-critical):', { adminId: admin.id, error: err })
            })
          )
        )
      }
    } catch (notificationError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating notifications:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Resubmission sent successfully'
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error resubmitting contribution:', { error, contributionId: id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to resubmit', 500)
  }
}

export const POST = createPostHandlerWithParams<{ id: string }>(handler, { requireAuth: true, loggerContext: 'api/contributions/[id]/resubmit' }) 