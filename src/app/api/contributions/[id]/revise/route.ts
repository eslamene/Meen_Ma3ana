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
  
  const { 
    amount, 
    message, 
    paymentMethod, 
    anonymous, 
    explanation,
    proofFileUrl 
  } = body

  // Validate required fields
  if (!amount || !paymentMethod || !explanation) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required fields: amount, paymentMethod, and explanation are required', 400)
  }

  // Validate amount
  if (amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'Amount must be greater than 0', 400)
  }

  try {
    const { ContributionService } = await import('@/lib/services/contributionService')
    const { CaseService } = await import('@/lib/services/caseService')
    const { NotificationService } = await import('@/lib/services/notificationService')

    // Verify the original contribution belongs to the current user
    const originalContribution = await ContributionService.getById(supabase, id)

    if (!originalContribution) {
      throw new ApiError('NOT_FOUND', 'Original contribution not found', 404)
    }

    if (originalContribution.donorId !== user.id) {
      throw new ApiError('FORBIDDEN', 'You can only revise your own contributions', 403)
    }

    // Get the current approval status to verify it's rejected
    const approvalStatusArray = originalContribution.approval_status || []
    const latestApprovalStatus = approvalStatusArray[0]

    if (!latestApprovalStatus) {
      throw new ApiError('NOT_FOUND', 'Approval status not found', 404)
    }

    if (latestApprovalStatus.status !== 'rejected') {
      throw new ApiError('VALIDATION_ERROR', 'Only rejected contributions can be revised', 400)
    }

    // Check if the case is still published
    if (!originalContribution.caseId) {
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    const caseData = await CaseService.getById(supabase, originalContribution.caseId)

    if (!caseData) {
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    if (caseData.status !== 'published') {
      throw new ApiError('VALIDATION_ERROR', 'Case is not published and cannot accept contributions', 400)
    }

    // Get payment method ID from code
    let paymentMethodId: string | null = null
    if (paymentMethod) {
      try {
        const { data: paymentMethodData } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('code', paymentMethod)
          .maybeSingle()
        
        paymentMethodId = paymentMethodData?.id || null
      } catch (error) {
        logger.warn('Error fetching payment method ID (non-critical):', { error })
      }
    }

    // Create the new revision contribution using ContributionService
    const newContribution = await ContributionService.create(supabase, {
      caseId: originalContribution.caseId!,
      amount: amount,
      message: message || null,
      anonymous: anonymous || false,
      paymentMethodId: paymentMethodId || paymentMethod, // Fallback to code if ID not found
      proofOfPayment: proofFileUrl || null,
      donorId: user.id
    })

    // Update the new contribution's notes to include revision info
    // Note: ContributionService.create doesn't support notes, so we update it separately
    try {
      await supabase
        .from('contributions')
        .update({
          notes: `REVISION: ${explanation}${message ? ` | Message: ${message}` : ''} | Original contribution ID: ${id}`
        })
        .eq('id', newContribution.id)
    } catch (error) {
      logger.warn('Error updating revision contribution notes (non-critical):', { error })
    }

    // Create approval status for the new contribution
    try {
      await supabase
        .from('contribution_approval_status')
        .insert({
          contribution_id: newContribution.id,
          status: 'pending',
          admin_comment: `Revision of contribution ${id}. Original rejection reason: ${latestApprovalStatus.rejection_reason || 'N/A'}`,
          resubmission_count: 0
        })
    } catch (approvalInsertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating approval status for revision:', approvalInsertError)
      // Don't fail the request, but log the error
    }

    // Update the original contribution's approval status to mark it as revised
    // Note: We need to get the approval status ID first
    try {
      const { data: approvalStatusData } = await supabase
        .from('contribution_approval_status')
        .select('id')
        .eq('contribution_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (approvalStatusData) {
        await supabase
          .from('contribution_approval_status')
          .update({
            status: 'revised',
            donor_reply: explanation,
            donor_reply_date: new Date().toISOString(),
            resubmission_count: (latestApprovalStatus.resubmission_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', approvalStatusData.id)
      }
    } catch (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating original approval status:', updateError)
      // Don't fail the request, but log the error
    }

    // Create notification for admins about the revision
    try {
      const { UserService } = await import('@/lib/services/userService')
      // Get admin users (simplified - get users with admin role)
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
              type: 'contribution_revised',
              title: 'Contribution Revision Submitted',
              message: `A contribution has been revised and submitted for review. Please check the updated information.`,
              data: {
                original_contribution_id: id,
                new_contribution_id: newContribution.id,
                case_id: originalContribution.caseId,
                revision_explanation: explanation,
                original_amount: originalContribution.amount,
                new_amount: amount
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
      message: 'Contribution revision created successfully',
      revisionId: newContribution.id
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating contribution revision:', { error, contributionId: id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to create revision', 500)
  }
}

export const POST = createPostHandlerWithParams<{ id: string }>(handler, { requireAuth: true, loggerContext: 'api/contributions/[id]/revise' }) 