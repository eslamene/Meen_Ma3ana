import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { env } from '@/config/env'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  // This endpoint is deprecated - web-push has been replaced with FCM
  logger.warn(
    '/api/push/public-key is deprecated. Web-push has been replaced with Firebase Cloud Messaging (FCM). ' +
    'Please use useFCMNotifications hook instead.'
  )

  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Web-push has been replaced with Firebase Cloud Messaging (FCM).',
      deprecated: true,
      message: 'Please use the FCM notification system instead. See: @/hooks/useFCMNotifications'
    },
    { status: 503 }
  )
}

export const GET = withApiHandler(getHandler, {
  requireAuth: false, // Public endpoint
  loggerContext: 'api/push/public-key',
})

