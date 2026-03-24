/**
 * Admin Role Permissions API Route
 * GET /api/admin/roles/[id]/permissions - Get permissions for a role
 * PUT /api/admin/roles/[id]/permissions - Update role permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { RoleService } from '@/lib/services/roleService'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase } = context
  const { id } = params

  const { role, permissions } = await RoleService.getRoleWithPermissionsForApi(supabase, id)

  return NextResponse.json({
    role,
    permissions
  })
}

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  const body = await request.json()
  const { permission_ids } = body

  logger.info('Updating role permissions:', {
    roleId: id,
    permissionIds: permission_ids
  })

  if (!Array.isArray(permission_ids)) {
    throw new ApiError('VALIDATION_ERROR', 'permission_ids must be an array', 400)
  }

  await RoleService.replaceRolePermissions(supabase, id, permission_ids)

  logger.info('Role permissions updated', { roleId: id, count: permission_ids.length })

  return NextResponse.json({
    success: true,
    message: 'Role permissions updated successfully'
  })
}

export const GET = createGetHandlerWithParams<{ id: string }>(getHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/roles/[id]/permissions'
})
export const PUT = createPutHandlerWithParams<{ id: string }>(putHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/roles/[id]/permissions'
})
