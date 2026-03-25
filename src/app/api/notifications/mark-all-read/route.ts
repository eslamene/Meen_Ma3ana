import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { NotificationService } from '@/lib/services/notificationService'

async function postHandler(_request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user } = context
  await NotificationService.markAllAsRead(supabase, user.id)
  return NextResponse.json({ success: true })
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/notifications/mark-all-read',
})
