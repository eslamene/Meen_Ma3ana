import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(approvalStatus)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
    const body = await request.json()
    const { status, rejection_reason, admin_comment, donor_reply, payment_proof_url } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if approval status exists
    const { data: existingStatus } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', id)
      .single()

    let result

    if (existingStatus) {
      // Update existing status
      const updateData: any = {
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

    // Send notification to donor
    if (status === 'approved' || status === 'rejected') {
      try {
        // Get contribution details for notification
        const { data: contribution } = await supabase
          .from('contributions')
          .select(`
            donor_id,
            amount,
            cases!inner(title)
          `)
          .eq('id', id)
          .single()

        if (contribution) {
          const notificationService = new ContributionNotificationService()
          
          if (status === 'approved') {
            const casesData = contribution.cases as any
            const caseTitle = Array.isArray(casesData) ? casesData[0]?.title : casesData?.title
            await notificationService.sendApprovalNotification(
              id,
              contribution.donor_id,
              contribution.amount,
              caseTitle || 'Unknown Case'
            )
          } else if (status === 'rejected' && rejection_reason) {
            const casesData = contribution.cases as any
            const caseTitle = Array.isArray(casesData) ? casesData[0]?.title : casesData?.title
            await notificationService.sendRejectionNotification(
              id,
              contribution.donor_id,
              contribution.amount,
              caseTitle || 'Unknown Case',
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
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 