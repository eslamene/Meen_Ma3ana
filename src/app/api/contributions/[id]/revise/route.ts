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

    // Verify the original contribution belongs to the current user
    const { data: originalContribution, error: contributionError } = await supabase
      .from('contributions')
      .select('id, donor_id, case_id, amount, case:cases(title_en, title_ar)')
      .eq('id', id)
      .single()

    if (contributionError || !originalContribution) {
      throw new ApiError('NOT_FOUND', 'Original contribution not found', 404)
    }

    if (originalContribution.donor_id !== user.id) {
      throw new ApiError('FORBIDDEN', 'You can only revise your own contributions', 403)
    }

    // Get the current approval status to verify it's rejected
    const { data: approvalStatus, error: approvalError } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', id)
      .single()

    if (approvalError || !approvalStatus) {
      throw new ApiError('NOT_FOUND', 'Approval status not found', 404)
    }

    if (approvalStatus.status !== 'rejected') {
      throw new ApiError('VALIDATION_ERROR', 'Only rejected contributions can be revised', 400)
    }

    // Check if the case is still published
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title, status')
      .eq('id', originalContribution.case_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    if (caseData.status !== 'published') {
      return NextResponse.json(
        { error: 'Case is not published and cannot accept contributions' },
        { status: 400 }
      )
    }

    // Create the new revision contribution (using existing schema)
    const { data: newContribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        case_id: originalContribution.case_id,
        donor_id: user.id,
        amount: amount,
        notes: `REVISION: ${explanation}${message ? ` | Message: ${message}` : ''}`, // Store revision info in notes
        payment_method: paymentMethod,
        proof_of_payment: proofFileUrl || null,
        anonymous: anonymous,
        type: 'donation',
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating revision contribution:', insertError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create revision contribution', 500)
    }

    // Create approval status for the new contribution
    const { error: approvalInsertError } = await supabase
      .from('contribution_approval_status')
      .insert({
        contribution_id: newContribution.id,
        status: 'pending',
        admin_comment: `Revision of contribution ${id}. Original rejection reason: ${approvalStatus.rejection_reason}`,
        resubmission_count: 0
      })

    if (approvalInsertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating approval status for revision:', approvalInsertError)
      // Don't fail the request, but log the error
    }

    // Update the original contribution's approval status to mark it as revised
    const { error: updateError } = await supabase
      .from('contribution_approval_status')
      .update({
        status: 'revised',
        donor_reply: explanation,
        donor_reply_date: new Date().toISOString(),
        resubmission_count: (approvalStatus.resubmission_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalStatus.id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating original approval status:', updateError)
      // Don't fail the request, but log the error
    }

    // Create notification for admins about the revision
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          type: 'contribution_revised',
          recipient_id: admin.id,
          title: 'Contribution Revision Submitted',
          message: `A contribution has been revised and submitted for review. Please check the updated information.`,
          data: {
            original_contribution_id: id,
            new_contribution_id: newContribution.id,
            case_id: originalContribution.case_id,
            revision_explanation: explanation,
            original_amount: originalContribution.amount,
            new_amount: amount
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
      message: 'Contribution revision created successfully',
      revisionId: newContribution.id
    })
}

export const POST = createPostHandlerWithParams<{ id: string }>(handler, { requireAuth: true, loggerContext: 'api/contributions/[id]/revise' }) 