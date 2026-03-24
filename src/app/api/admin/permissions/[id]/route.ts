/**
 * Admin Permission API Route - Create/Update/Delete
 * POST /api/admin/permissions - Create permission
 * PUT /api/admin/permissions/[id] - Update permission
 * DELETE /api/admin/permissions/[id] - Delete permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

  const body = await request.json()
  const { display_name, display_name_ar, description, description_ar } = body

  try {
    const { PermissionService } = await import('@/lib/services/permissionService')
    
    const permission = await PermissionService.update(supabase, id, {
      display_name,
      display_name_ar: display_name_ar || null,
      description: description || null,
      description_ar: description_ar || null,
    })

    return NextResponse.json({ permission })
  } catch (error) {
    if (error instanceof Error && error.message.includes('system permissions')) {
      throw new ApiError('VALIDATION_ERROR', error.message, 400)
    }
    if (error instanceof Error && error.message.includes('not found')) {
      throw new ApiError('NOT_FOUND', error.message, 404)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating permission:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to update permission', 500)
  }
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

  try {
    const { PermissionService } = await import('@/lib/services/permissionService')
    
    await PermissionService.delete(supabase, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('system permissions')) {
      throw new ApiError('VALIDATION_ERROR', error.message, 400)
    }
    if (error instanceof Error && error.message.includes('not found')) {
      throw new ApiError('NOT_FOUND', error.message, 404)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting permission:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to delete permission', 500)
  }
}

export const PUT = createPutHandlerWithParams<{ id: string }>(putHandler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/permissions/[id]' })
export const DELETE = createDeleteHandlerWithParams<{ id: string }>(deleteHandler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/permissions/[id]' })

