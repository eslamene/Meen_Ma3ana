import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { NotificationService } from '@/lib/services/notificationService'

async function getHandler(_request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user } = context
  const count = await NotificationService.getUnreadCount(supabase, user.id)
  return NextResponse.json({ count, unreadCount: count })
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  loggerContext: 'api/notifications/unread-count',
})
