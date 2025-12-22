import { NextRequest, NextResponse } from 'next/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  const notificationService = createContributionNotificationService(supabase)
  const success = await notificationService.markNotificationAsReadSimple(id)
  
  if (!success) {
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to mark notification as read', 500)
  }

  return NextResponse.json({ success: true })
}

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/notifications/[id]/read' 
}) 