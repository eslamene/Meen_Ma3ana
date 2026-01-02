import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createBilingualNotification, NOTIFICATION_TEMPLATES } from '@/lib/notifications/bilingual-helpers'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  try {
    // Log for debugging
    logger.debug('Fetching notifications for user:', { userId: user.id, email: user.email })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const readStatus = searchParams.get('read') || '' // 'read', 'unread', or ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // First, check if there are ANY notifications for this user (for debugging)
    const { count: totalCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
    
    logger.debug('Total notifications count for user:', { 
      userId: user.id, 
      totalCount: totalCount || 0,
      countError: countError?.message 
    })

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
      logger.error('Query error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      )
    }

    logger.debug('Notifications query result:', {
      userId: user.id,
      notificationsCount: notifications?.length || 0,
      totalCount: count || 0,
      page,
      limit
    })

    // Enhance notifications with case titles for old notifications that don't have them
    if (notifications && notifications.length > 0) {
      // Collect all case IDs that need lookup
      const caseIdsToLookup = new Set<string>()
      notifications.forEach((notification: any) => {
        if (notification.data) {
          const data = typeof notification.data === 'string' 
            ? JSON.parse(notification.data) 
            : notification.data
          
          // If notification has case_id but no case_title, we need to look it up
          if (data.case_id && !data.case_title) {
            caseIdsToLookup.add(data.case_id)
          }
        }
      })

      // Look up case titles for notifications that need them
      if (caseIdsToLookup.size > 0) {
        const { data: casesData } = await supabase
          .from('cases')
          .select('id, title_en, title_ar')
          .in('id', Array.from(caseIdsToLookup))

        // Create a map of case ID to case title
        const caseTitleMap = new Map<string, string>()
        if (casesData) {
          casesData.forEach((caseItem: any) => {
            const caseTitle = caseItem.title_en || caseItem.title_ar || 'Unknown Case'
            caseTitleMap.set(caseItem.id, caseTitle)
          })
        }

        // Update notifications with case titles and regenerate messages if needed
        notifications.forEach((notification: any) => {
          if (notification.data) {
            const data = typeof notification.data === 'string' 
              ? JSON.parse(notification.data) 
              : notification.data
            
            // If we have a case_id but no case_title, add it from the lookup
            if (data.case_id && !data.case_title) {
              const caseTitle = caseTitleMap.get(data.case_id) || 'Unknown Case'
              data.case_title = caseTitle
              // Update the notification data
              notification.data = data
              
              // Regenerate message text if it contains "Unknown Case"
              if (caseTitle !== 'Unknown Case' && (notification.message_en?.includes('Unknown Case') || notification.message_ar?.includes('Unknown Case'))) {
                // Determine which template to use based on notification type
                let template
                if (notification.type === 'contribution_pending') {
                  // Check if it's an admin notification (newContributionSubmitted) or donor notification (contributionPending)
                  if (notification.message_en?.includes('A new contribution')) {
                    template = NOTIFICATION_TEMPLATES.newContributionSubmitted
                  } else {
                    template = NOTIFICATION_TEMPLATES.contributionPending
                  }
                } else if (notification.type === 'contribution_approved') {
                  template = NOTIFICATION_TEMPLATES.contributionApproved
                } else if (notification.type === 'contribution_rejected') {
                  template = NOTIFICATION_TEMPLATES.contributionRejected
                }
                
                // Regenerate messages if we have a template and the required data
                if (template && data.amount) {
                  const placeholders: Record<string, string | number> = {
                    amount: data.amount,
                    caseTitle: caseTitle
                  }
                  
                  if (data.rejection_reason) {
                    placeholders.reason = data.rejection_reason
                  }
                  
                  const content = createBilingualNotification(
                    template.title_en,
                    template.title_ar,
                    template.message_en,
                    template.message_ar,
                    placeholders
                  )
                  
                  // Update the notification messages
                  notification.message_en = content.message_en
                  notification.message_ar = content.message_ar
                  // Also update legacy fields for backward compatibility
                  notification.message = content.message_en
                  notification.title_en = content.title_en
                  notification.title_ar = content.title_ar
                  notification.title = content.title_en
                }
              }
            }
          }
        })
      }
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
