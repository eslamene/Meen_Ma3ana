import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { caseUpdateService } from '@/lib/case-updates'
import { caseNotificationService } from '@/lib/notifications/case-notifications'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { logger } = context
  const { id } = params
  const { searchParams } = new URL(request.url)
  const includePrivate = searchParams.get('includePrivate') === 'true'
  
  const updates = await caseUpdateService.getDynamicUpdates({
    caseId: id,
    isPublic: includePrivate ? undefined : true,
    limit: 50
  })
  
  return NextResponse.json({
    updates: updates || []
  })
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, logger } = context
  const { id } = params
  const body = await request.json()
  const { title, content, updateType, isPublic, attachments } = body

  if (!title || !content) {
    throw new ApiError('VALIDATION_ERROR', 'Title and content are required', 400)
  }

    const newUpdate = await caseUpdateService.createUpdate({
      caseId: id,
      title,
      content,
      updateType,
      isPublic,
      attachments,
      createdBy: user.id,
    })

    // Send notification for the new update
    try {
      await caseNotificationService.createCaseUpdateNotification(
        id,
        newUpdate.id,
        newUpdate.title,
        newUpdate.updateType,
        user.id
      )
    } catch (notificationError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      update: newUpdate
    }, { status: 201 })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/cases/[id]/updates' 
})

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/updates' 
}) 