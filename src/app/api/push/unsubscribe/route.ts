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
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing push subscription:', error)
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in push unsubscribe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withApiHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/push/unsubscribe',
})

