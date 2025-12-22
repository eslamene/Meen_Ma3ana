import { NextRequest, NextResponse } from 'next/server'
import { createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context

    const body = await request.json()
    const { action, reviewComment } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid action. Must be "approve" or "reject"', 400)
    }

    // Get sponsorship details first
    const { data: sponsorship, error: fetchError } = await supabase
      .from('sponsorships')
      .select('sponsor_id, case_id, amount, case:cases(title_en, title_ar)')
      .eq('id', params.id)
      .single()

    if (fetchError || !sponsorship) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorship:', fetchError)
      throw new ApiError('NOT_FOUND', 'Sponsorship not found', 404)
    }

    // Update sponsorship status
    const updateData: { status: string; terms?: string } = { status: action === 'approve' ? 'approved' : 'rejected' }
    if (action === 'reject' && reviewComment) {
      updateData.terms = reviewComment
    }

    const { error: updateError } = await supabase
      .from('sponsorships')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating sponsorship:', updateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update sponsorship', 500)
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
}

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/sponsorships/[id]' 
})

