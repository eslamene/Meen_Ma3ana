import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fcmToken, deviceId, platform } = body

    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length === 0) {
      return NextResponse.json(
        { error: 'Invalid FCM token' },
        { status: 400 }
      )
    }

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || null

    // Upsert FCM token (replace if exists for same user+token)
    // Always use service role client to bypass RLS for server-side operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for FCM token operations')
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing' },
        { status: 500 }
      )
    }

    const supabaseClient = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { error, data } = await supabaseClient
      .from('fcm_tokens')
      .upsert(
        {
          user_id: user.id,
          fcm_token: fcmToken,
          device_id: deviceId || null,
          platform: platform || 'web',
          user_agent: userAgent,
          active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,fcm_token',
        }
      )
      .select()

    if (error) {
      // Convert Supabase error to proper Error instance for logging
      const errorMessage = error.message || 'Failed to save FCM token'
      const errorCode = error.code || 'UNKNOWN_ERROR'
      const dbError = new Error(`Database error [${errorCode}]: ${errorMessage}`)
      if (error.details) {
        (dbError as any).details = error.details
      }
      if (error.hint) {
        (dbError as any).hint = error.hint
      }
      logger.error('Error saving FCM token:', dbError, {
        errorCode,
        userId: user.id,
        hasFcmToken: !!fcmToken
      })
      return NextResponse.json(
        { error: 'Failed to save FCM token', details: errorMessage },
        { status: 500 }
      )
    }

    logger.info('FCM token registered successfully', {
      userId: user.id,
      platform: platform || 'web',
      hasDeviceId: !!deviceId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Convert error to proper Error instance for logging
    let errorToLog: Error
    if (error instanceof Error) {
      errorToLog = error
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      const message = errorObj.message as string | undefined
      const code = errorObj.code as string | undefined
      errorToLog = new Error(message || code || 'Unknown error occurred')
      if (code) {
        (errorToLog as any).code = code
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
  loggerContext: 'api/push/fcm-subscribe',
})

