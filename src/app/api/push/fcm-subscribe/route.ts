import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { PushSubscriptionService } from '@/lib/services/pushSubscriptionService'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fcmToken, deviceId, platform } = body

    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length === 0) {
      return NextResponse.json({ error: 'Invalid FCM token' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent') || null

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for FCM token operations')
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing' },
        { status: 500 }
      )
    }

    const supabaseClient = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    await PushSubscriptionService.upsertFCMToken(supabaseClient, user.id, {
      fcmToken,
      deviceId: deviceId || null,
      platform: platform || 'web',
      userAgent
    })

    logger.info('FCM token registered successfully', {
      userId: user.id,
      platform: platform || 'web',
      hasDeviceId: !!deviceId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    let errorToLog: Error
    if (error instanceof Error) {
      errorToLog = error
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      const message = errorObj.message as string | undefined
      const code = errorObj.code as string | undefined
      errorToLog = new Error(message || code || 'Unknown error occurred')
      if (code) {
        ;(errorToLog as Error & { code?: string }).code = code
      }
    } else {
      errorToLog = new Error('Unknown error occurred')
    }

    logger.error('Error in FCM subscribe:', errorToLog, {
      userId: user?.id,
      errorType: typeof error
    })
    return NextResponse.json(
      { error: 'Internal server error', details: errorToLog.message },
      { status: 500 }
    )
  }
}

export const POST = withApiHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/push/fcm-subscribe'
})
