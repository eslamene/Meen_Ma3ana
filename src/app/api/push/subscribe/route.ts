import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createClient } from '@/lib/supabase/server'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || null

    // Upsert subscription (replace if exists for same user+endpoint)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,endpoint',
        }
      )

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error saving push subscription:', error)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in push subscribe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withApiHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/push/subscribe',
})

