import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const supabase = await createClient()
    const params = await context.params
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: adminRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('admin_roles.name', ['admin', 'super_admin'])
      .limit(1)

    const isAdmin = (adminRoles?.length || 0) > 0

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, reviewComment } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get sponsorship details first
    const { data: sponsorship, error: fetchError } = await supabase
      .from('sponsorships')
      .select('sponsor_id, case_id, amount, case:cases(title_en, title_ar)')
      .eq('id', params.id)
      .single()

    if (fetchError || !sponsorship) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorship:', fetchError)
      return NextResponse.json(
        { error: 'Sponsorship not found' },
        { status: 404 }
      )
    }

    // Update sponsorship status
    const updateData: any = { status: action === 'approve' ? 'approved' : 'rejected' }
    if (action === 'reject' && reviewComment) {
      updateData.terms = reviewComment
    }

    const { error: updateError } = await supabase
      .from('sponsorships')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating sponsorship:', updateError)
      return NextResponse.json(
        { error: 'Failed to update sponsorship' },
        { status: 500 }
      )
    }

    // Create notification for sponsor
    const caseData = Array.isArray(sponsorship.case) ? sponsorship.case[0] : sponsorship.case
    const notificationType = action === 'approve' ? 'sponsorship_approved' : 'sponsorship_rejected'
    const notificationTitle = action === 'approve' 
      ? 'Sponsorship Request Approved'
      : 'Sponsorship Request Rejected'
    const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
    const notificationMessage = action === 'approve'
      ? `Your sponsorship request for "${caseTitle}" has been approved.`
      : `Your sponsorship request for "${caseTitle}" has been rejected.`

    await supabase
      .from('notifications')
      .insert({
        type: notificationType,
        recipient_id: sponsorship.sponsor_id,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          sponsorshipId: params.id,
          caseId: sponsorship.case_id,
          amount: sponsorship.amount,
          reason: reviewComment || null
        }
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin sponsorships PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

