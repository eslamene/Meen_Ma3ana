import { NextRequest, NextResponse } from 'next/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase } = context
  const { id } = params

  const { NotificationService } = await import('@/lib/services/notificationService')
  
  try {
    await NotificationService.markAsRead(supabase, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message, 500)
    }
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to mark notification as read', 500)
  }
}

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/notifications/[id]/read' 
}) 