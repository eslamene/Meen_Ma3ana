import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  try {

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const readStatus = searchParams.get('read') || '' // 'read', 'unread', or ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_id', user.id)

    // Apply search filter (search in both legacy and bilingual fields)
    if (search) {
      // Escape special characters for ilike
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(
        `title.ilike.%${escapedSearch}%,message.ilike.%${escapedSearch}%,title_en.ilike.%${escapedSearch}%,title_ar.ilike.%${escapedSearch}%,message_en.ilike.%${escapedSearch}%,message_ar.ilike.%${escapedSearch}%`
      )
    }

    // Apply type filter
    if (type) {
      query = query.eq('type', type)
    }

    // Apply read status filter
    if (readStatus === 'read') {
      query = query.eq('read', true)
    } else if (readStatus === 'unread') {
      query = query.eq('read', false)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending })
    } else if (sortBy === 'type') {
      query = query.order('type', { ascending })
    } else if (sortBy === 'read') {
      query = query.order('read', { ascending })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error, count } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count (for all notifications, not filtered)
    const notificationService = createContributionNotificationService(supabase)
    const unreadCount = await notificationService.getUnreadNotificationCount(user.id)

    const totalPages = count ? Math.ceil(count / limit) : 1

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  try {

    const body = await request.json()
    const { action, notificationId } = body

    const notificationService = createContributionNotificationService(supabase)

    if (action === 'markAllAsRead' || action === 'mark-all-read') {
      const success = await notificationService.markAllNotificationsAsRead(user.id)
      
      if (success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        )
      }
    }

    if (action === 'markAsRead' && notificationId) {
      const success = await notificationService.markNotificationAsRead(notificationId, user.id)
      
      if (success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error handling notification action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(getHandler, { requireAuth: true, loggerContext: 'api/notifications' })
export const POST = withApiHandler(postHandler, { requireAuth: true, loggerContext: 'api/notifications' })
