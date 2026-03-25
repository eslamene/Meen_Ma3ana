import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { NotificationService } from '@/lib/services/notificationService'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user } = context
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const readParam = searchParams.get('read') || ''
  const readStatus =
    readParam === 'read' ? 'read' : readParam === 'unread' ? 'unread' : ''
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  const result = await NotificationService.getNotifications(supabase, {
    page,
    limit,
    search,
    type,
    readStatus,
    sortBy,
    sortOrder,
    recipientId: user.id,
  })

  return NextResponse.json({
    notifications: result.notifications,
    unreadCount: result.unreadCount,
    pagination: result.pagination,
  })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user } = context
  const body = await request.json()
  const { action, notificationId } = body

  if (action === 'markAllAsRead') {
    await NotificationService.markAllAsRead(supabase, user.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'markAsRead') {
    if (!notificationId || typeof notificationId !== 'string') {
      throw new ApiError('VALIDATION_ERROR', 'notificationId is required', 400)
    }
    const existing = await NotificationService.getById(supabase, notificationId)
    if (!existing || existing.recipient_id !== user.id) {
      throw new ApiError('NOT_FOUND', 'Notification not found', 404)
    }
    await NotificationService.markAsRead(supabase, notificationId)
    return NextResponse.json({ success: true })
  }

  throw new ApiError('VALIDATION_ERROR', 'Invalid action', 400)
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  loggerContext: 'api/notifications',
})

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/notifications',
})
