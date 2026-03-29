import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { NotificationService } from '@/lib/services/notificationService'

async function getHandler(
  _request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user } = context
  const { id } = params

  const notification = await NotificationService.getById(context.supabase, id)
  if (!notification || notification.recipient_id !== user.id) {
    throw new ApiError('NOT_FOUND', 'Notification not found', 404)
  }

  return NextResponse.json({ notification })
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: true,
  loggerContext: 'api/notifications/[id]',
})
