import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { caseUpdateService } from '@/lib/case-updates'
import { caseNotificationService } from '@/lib/notifications/case-notifications'
import { createClient } from '@/lib/supabase/server'

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

      // Send push notifications to contributing users
      try {
        const { createClient: createSupabaseClient } = await import('@/lib/supabase/server')
        const supabaseClient = await createSupabaseClient()
        
        // Get case details
        const { data: caseData } = await supabaseClient
          .from('cases')
          .select('title_en, title_ar')
          .eq('id', id)
          .single()

        if (caseData) {
          // Get contributing users
          const contributorUserIds = await caseNotificationService.getContributingUsers(id)

          if (contributorUserIds.length > 0) {
            const { fcmNotificationService } = await import('@/lib/notifications/fcm-notifications')
            await fcmNotificationService.notifyCaseUpdated(
              id,
              caseData.title_en || '',
              caseData.title_ar || undefined,
              newUpdate.title,
              contributorUserIds
            )
          }
        }
      } catch (pushError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending push notifications for case update:', pushError)
        // Don't fail the request if push notification fails
      }
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