import { NextRequest, NextResponse } from 'next/server'
import { createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { caseUpdateService } from '@/lib/case-updates'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string; updateId: string }
) {
  const { supabase, user, logger } = context
  const { updateId } = params
  const body = await request.json()
  const { title, content, updateType, isPublic, attachments } = body

  if (!title || !content) {
    throw new ApiError('VALIDATION_ERROR', 'Title and content are required', 400)
  }

  // Check if user can edit this update
  const existingUpdate = await caseUpdateService.getUpdateById(updateId)

  if (!existingUpdate) {
    throw new ApiError('NOT_FOUND', 'Update not found', 404)
  }

  // Check if user is admin or the creator of the update
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'admin' && existingUpdate.createdBy !== user.id) {
    throw new ApiError('FORBIDDEN', 'You can only edit your own updates', 403)
  }

  const result = await caseUpdateService.updateUpdate(updateId, {
    title,
    content,
    updateType,
    isPublic,
    attachments,
  })

  if (!result.success) {
    throw new ApiError('INTERNAL_SERVER_ERROR', result.error || 'Failed to update case update', 500)
  }

  return NextResponse.json({
    update: result.update
  })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string; updateId: string }
) {
  const { supabase, user, logger } = context
  const { updateId } = params

  // Check if user can delete this update
  const existingUpdate = await caseUpdateService.getUpdateById(updateId)

  if (!existingUpdate) {
    throw new ApiError('NOT_FOUND', 'Update not found', 404)
  }

  // Check if user is admin or the creator of the update
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'admin' && existingUpdate.createdBy !== user.id) {
    throw new ApiError('FORBIDDEN', 'You can only delete your own updates', 403)
  }

  const result = await caseUpdateService.deleteUpdate(updateId)

  if (!result.success) {
    throw new ApiError('INTERNAL_SERVER_ERROR', result.error || 'Failed to delete case update', 500)
  }

  return NextResponse.json({
    success: true
  })
}

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/updates/[updateId]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/updates/[updateId]' 
}) 