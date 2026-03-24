/**
 * Admin Permissions API Route
 * GET /api/admin/permissions - Get all permissions
 * POST /api/admin/permissions - Create a permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const permissions = await adminService.getPermissions()
  return NextResponse.json({ permissions })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { name, display_name, display_name_ar, description, description_ar, resource, action } = body

  if (!name || !display_name || !resource || !action) {
    throw new ApiError('VALIDATION_ERROR', 'Name, display_name, resource, and action are required', 400)
  }

  try {
    const { PermissionService } = await import('@/lib/services/permissionService')
    
    const permission = await PermissionService.create(supabase, {
      name,
      display_name,
      display_name_ar: display_name_ar || null,
      description: description || null,
      description_ar: description_ar || null,
      resource,
      action,
      is_system: false,
      is_active: true,
    })

    return NextResponse.json({ permission })
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ApiError('VALIDATION_ERROR', error.message, 400)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating permission:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to create permission', 500)
  }
}

export const GET = createGetHandler(getHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/permissions' })
export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/permissions' })
