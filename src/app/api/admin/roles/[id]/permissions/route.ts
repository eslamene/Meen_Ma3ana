/**
 * Admin Role Permissions API Route
 * GET /api/admin/roles/[id]/permissions - Get permissions for a role
 * PUT /api/admin/roles/[id]/permissions - Update role permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createGetHandlerWithParams, createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    // Fetch role with permissions
    const { data: roleData, error } = await supabase
      .from('admin_roles')
      .select(`
        id,
        name,
        display_name,
        admin_role_permissions(
          permission_id,
          admin_permissions(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Extract permissions
    interface RolePermission {
      permission_id: string
      admin_permissions?: unknown
    }
    const permissions = (roleData.admin_role_permissions || [])
      .map((rp: RolePermission) => rp.admin_permissions)
      .filter(Boolean)

    return NextResponse.json({
      role: {
        id: roleData.id,
        name: roleData.name,
        display_name: roleData.display_name
      },
      permissions
    })
}

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
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

    // Remove all existing permissions for this role
    const { error: deleteError, data: deleteData } = await supabase
      .from('admin_role_permissions')
      .delete()
      .eq('role_id', id)
      .select()

    if (deleteError) {
      logger.error('Error deleting role permissions:', {
        roleId: id,
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint
      })
      throw deleteError
    }

    logger.info('Deleted existing permissions:', deleteData?.length || 0)

    // Add new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: id,
        permission_id: permissionId
      }))

      const { error: insertError, data: insertData } = await supabase
        .from('admin_role_permissions')
        .insert(rolePermissions)
        .select()

      if (insertError) {
        logger.error('Error inserting role permissions:', {
          roleId: id,
          permissionIds: permission_ids,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        throw insertError
      }

      logger.info('Inserted new permissions:', insertData?.length || 0)
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully'
    })
}

export const GET = createGetHandlerWithParams<{ id: string }>(getHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles/[id]/permissions' })
export const PUT = createPutHandlerWithParams<{ id: string }>(putHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles/[id]/permissions' })
