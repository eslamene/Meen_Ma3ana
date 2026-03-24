import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context

  try {
    const { SponsorshipService } = await import('@/lib/services/sponsorshipService')
    const sponsorship = await SponsorshipService.getById(supabase, params.id)

    if (!sponsorship) {
      throw new ApiError('NOT_FOUND', 'Sponsorship not found', 404)
    }

    return NextResponse.json({ sponsorship })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorship:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch sponsorship', 500)
  }
}

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

  try {
    const { SponsorshipService } = await import('@/lib/services/sponsorshipService')
    const { NotificationService } = await import('@/lib/services/notificationService')

    // Get sponsorship details first
    const sponsorship = await SponsorshipService.getById(supabase, params.id)

    if (!sponsorship) {
      throw new ApiError('NOT_FOUND', 'Sponsorship not found', 404)
    }

    // Update sponsorship status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await SponsorshipService.update(supabase, params.id, {
      status: newStatus,
      terms: action === 'reject' && reviewComment ? reviewComment : undefined
    })

    // Create notification for sponsor
    const caseTitle = sponsorship.case?.title_en || sponsorship.case?.title_ar || 'Unknown Case'
    const notificationType = action === 'approve' ? 'sponsorship_approved' : 'sponsorship_rejected'
    const notificationTitle = action === 'approve' 
      ? 'Sponsorship Request Approved'
      : 'Sponsorship Request Rejected'
    const notificationMessage = action === 'approve'
      ? `Your sponsorship request for "${caseTitle}" has been approved.`
      : `Your sponsorship request for "${caseTitle}" has been rejected.`

    await NotificationService.create(supabase, {
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
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating sponsorship:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to update sponsorship', 500)
  }
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/sponsorships/[id]' 
})

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/sponsorships/[id]' 
})

