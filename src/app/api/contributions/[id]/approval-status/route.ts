import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { createGetHandlerWithParams, createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params
    
    // Get the contribution approval status
    const { data: approvalStatus, error } = await supabase
      .from('contribution_approval_status')
      .select(`
        *,
        contributions:contribution_id(*),
        admin:admin_id(id, first_name, last_name, email)
      `)
      .eq('contribution_id', id)
      .single()

    if (error) {
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message, 500)
    }

    return NextResponse.json(approvalStatus)
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params
  
  const body = await request.json()
  const { status, rejection_reason, admin_comment, donor_reply, payment_proof_url } = body

    // Check if approval status exists
    const { data: existingStatus } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', id)
      .single()

    let result

    if (existingStatus) {
      // Update existing status
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'rejected') {
        updateData.admin_id = user.id
        updateData.rejection_reason = rejection_reason
        updateData.admin_comment = admin_comment
        updateData.resubmission_count = existingStatus.resubmission_count + 1
      } else if (status === 'approved') {
        updateData.admin_id = user.id
        updateData.admin_comment = admin_comment
      } else if (status === 'acknowledged') {
        updateData.donor_reply = donor_reply
        updateData.donor_reply_date = new Date().toISOString()
      }

      if (donor_reply) {
        updateData.donor_reply = donor_reply
        updateData.donor_reply_date = new Date().toISOString()
      }

      if (payment_proof_url) {
        updateData.payment_proof_url = payment_proof_url
      }

      const { data, error } = await supabase
        .from('contribution_approval_status')
        .update(updateData)
        .eq('contribution_id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Create new status
      const newStatus = {
        contribution_id: id,
        status,
        admin_id: status === 'rejected' || status === 'approved' ? user.id : null,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        admin_comment: status === 'rejected' || status === 'approved' ? admin_comment : null,
        donor_reply: donor_reply || null,
        donor_reply_date: donor_reply ? new Date().toISOString() : null,
        payment_proof_url: payment_proof_url || null,
        resubmission_count: 0
      }

      const { data, error } = await supabase
        .from('contribution_approval_status')
        .insert(newStatus)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    // Update the main contribution status
    await supabase
      .from('contributions')
      .update({ status })
      .eq('id', id)

    // Update case current_amount when contribution is approved or rejected
    if (status === 'approved' || status === 'rejected') {
      try {
        // Get contribution details including case_id and amount
        const { data: contribution } = await supabase
          .from('contributions')
          .select('case_id, amount')
          .eq('id', id)
          .single()

        if (contribution && contribution.case_id) {
          // Get current case amount
          const { data: caseData } = await supabase
            .from('cases')
            .select('current_amount')
            .eq('id', contribution.case_id)
            .single()

          if (caseData) {
            const currentAmount = parseFloat(caseData.current_amount || '0')
            const contributionAmount = parseFloat(contribution.amount || '0')
            
            let newAmount = currentAmount
            if (status === 'approved') {
              // Add contribution amount if approved
              // Check if this contribution was previously rejected (to avoid double counting)
              if (existingStatus && existingStatus.status === 'rejected') {
                // Was rejected, now approved - add the amount
                newAmount = currentAmount + contributionAmount
              } else if (!existingStatus) {
                // New approval - add the amount
                newAmount = currentAmount + contributionAmount
              }
              // If it was already approved, don't change the amount
            } else if (status === 'rejected') {
              // Subtract contribution amount if rejected
              // Only subtract if it was previously approved
              if (existingStatus && existingStatus.status === 'approved') {
                newAmount = Math.max(0, currentAmount - contributionAmount)
              }
              // If it was already rejected or pending, don't change the amount
            }

            // Update case current_amount
            await supabase
              .from('cases')
              .update({ 
                current_amount: newAmount.toString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', contribution.case_id)
          }
        }
      } catch (amountUpdateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating case amount:', amountUpdateError)
        // Don't fail the main operation if amount update fails
      }
    }

    // Send notification to donor
    if (status === 'approved' || status === 'rejected') {
      try {
        // Get contribution details for notification
        const { data: contribution } = await supabase
          .from('contributions')
          .select(`
            donor_id,
            amount,
            cases!inner(title_en, title_ar)
          `)
          .eq('id', id)
          .single()

        if (contribution) {
          const notificationService = createContributionNotificationService(supabase)
          type CaseJoin = { title_en?: string; title_ar?: string } | Array<{ title_en?: string; title_ar?: string }> | null | undefined
          
          if (status === 'approved') {
            const casesData = contribution.cases as CaseJoin
            const caseObj = Array.isArray(casesData) ? casesData[0] : casesData
            const caseTitle = caseObj?.title_en || caseObj?.title_ar || 'Unknown Case'
            await notificationService.sendApprovalNotification(
              id,
              contribution.donor_id,
              contribution.amount,
              caseTitle
            )
          } else if (status === 'rejected' && rejection_reason) {
            const casesData = contribution.cases as CaseJoin
            const caseObj = Array.isArray(casesData) ? casesData[0] : casesData
            const caseTitle = caseObj?.title_en || caseObj?.title_ar || 'Unknown Case'
            await notificationService.sendRejectionNotification(
              id,
              contribution.donor_id,
              contribution.amount,
              caseTitle,
              rejection_reason
            )
          }
        }
      } catch (notificationError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending notification:', notificationError)
        // Don't fail the main operation if notification fails
      }
    }

    return NextResponse.json(result)
}

export const GET = createGetHandlerWithParams<{ id: string }>(getHandler, { requireAuth: true, loggerContext: 'api/contributions/[id]/approval-status' })
export const POST = createPostHandlerWithParams<{ id: string }>(postHandler, { requireAuth: true, loggerContext: 'api/contributions/[id]/approval-status' }) 