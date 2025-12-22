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

  // Update message as read (only if user is the recipient)
  const { error: updateError } = await supabase
    .from('communications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('recipient_id', user.id)

  if (updateError) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error marking message as read', { error: updateError })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to mark message as read', 500)
  }

  return NextResponse.json({ success: true })
}

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications/[id]/read' 
})

