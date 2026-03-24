import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { PushSubscriptionService } from '@/lib/services/pushSubscriptionService'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    await PushSubscriptionService.removeSubscription(supabase, user.id, endpoint)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in push unsubscribe:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}

export const POST = withApiHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/push/unsubscribe'
})
