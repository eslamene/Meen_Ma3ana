import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { fcmNotificationService } from '@/lib/notifications/fcm-notifications'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user, logger } = context

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Send a test push notification to the current user using FCM
    const sentCount = await fcmNotificationService.notifyUsers(
      [user.id],
      {
        title: 'Test Push Notification',
        body: 'This is a test push notification from Meen Ma3ana. If you see this, push notifications are working correctly!',
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          type: 'test',
          url: '/test-push',
          timestamp: new Date().toISOString(),
        },
        tag: 'test-notification',
        requireInteraction: true,
      }
    )

    if (sentCount > 0) {
      logger.info(`Test push notification sent to user ${user.id}, sentCount: ${sentCount}`)
      return NextResponse.json({
        success: true,
        message: 'Test push notification sent successfully',
        sentCount,
      })
    } else {
      logger.warn(`No active subscriptions found for user ${user.id}`)
      
      // Provide more helpful error message
      return NextResponse.json({
        success: false,
        message: 'No active FCM tokens found for your account. Please ensure you have subscribed to push notifications and your token is active in the database.',
        sentCount: 0,
        userId: user.id,
        hint: 'Check the fcm_tokens table to verify your token exists and is marked as active',
      }, { status: 400 })
    }
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending test push notification:', error)
    
    // Extract error message from nested error objects
    let errorMessage = 'Unknown error'
    if (error?.message) {
      errorMessage = error.message
    } else if (error?.error) {
      errorMessage = error.error
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    // Check if it's a table missing error
    if (errorMessage.includes('does not exist') || errorMessage.includes('fcm_tokens')) {
      return NextResponse.json(
        { 
          error: 'Database table missing',
          message: 'The fcm_tokens table does not exist. Please run migration 1013_add_fcm_tokens.sql first.',
          details: errorMessage
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to send test notification',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}

export const POST = withApiHandler(postHandler, { requireAuth: true, loggerContext: 'api/push/test' })

