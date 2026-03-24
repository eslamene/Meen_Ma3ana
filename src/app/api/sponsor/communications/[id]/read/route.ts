import { NextRequest, NextResponse } from 'next/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, user, logger } = context
  const { id } = params

  try {
    const { CommunicationService } = await import('@/lib/services/communicationService')

    // Mark message as read (only if user is the recipient)
    await CommunicationService.markAsRead(supabase, id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('access denied'))) {
      throw new ApiError('NOT_FOUND', error.message, 404)
    }
    if (error instanceof Error && error.message.includes('recipient')) {
      throw new ApiError('FORBIDDEN', error.message, 403)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error marking message as read', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to mark message as read', 500)
  }
}

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications/[id]/read' 
})

