import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reply } = body

    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { error: 'Reply is required' },
        { status: 400 }
      )
    }

    // Verify the contribution belongs to the current user
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .select('id, donor_id, case_id')
      .eq('id', id)
      .single()

    if (contributionError || !contribution) {
      return NextResponse.json(
        { error: 'Contribution not found' },
        { status: 404 }
      )
    }

    if (contribution.donor_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only resubmit your own contributions' },
        { status: 403 }
      )
    }

    // Get the current approval status
    const { data: approvalStatus, error: approvalError } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', id)
      .single()

    if (approvalError || !approvalStatus) {
      return NextResponse.json(
        { error: 'Approval status not found' },
        { status: 404 }
      )
    }

    if (approvalStatus.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only rejected contributions can be resubmitted' },
        { status: 400 }
      )
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in resubmission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 