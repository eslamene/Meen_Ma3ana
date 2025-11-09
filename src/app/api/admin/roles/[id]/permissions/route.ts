/**
 * Admin Role Permissions API Route
 * GET /api/admin/roles/[id]/permissions - Get permissions for a role
 * PUT /api/admin/roles/[id]/permissions - Update role permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'
import { RouteContext } from '@/types/next-api'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const hasAdminRole = await adminService.hasRole(user.id, 'admin') || 
                         await adminService.hasRole(user.id, 'super_admin')

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      .eq('id', params.id)
      .single()

    if (error) throw error

    // Extract permissions
    const permissions = (roleData.admin_role_permissions || [])
      .map((rp: any) => rp.admin_permissions)
      .filter(Boolean)

    return NextResponse.json({
      role: {
        id: roleData.id,
        name: roleData.name,
        display_name: roleData.display_name
      },
      permissions
    })
  } catch (error) {
    defaultLogger.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can update role permissions
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { permission_ids } = body

    defaultLogger.info('Updating role permissions:', {
      roleId: params.id,
      permissionIds: permission_ids
    })

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json(
        { error: 'permission_ids must be an array' },
        { status: 400 }
      )
    }

    // Remove all existing permissions for this role
    const { error: deleteError, data: deleteData } = await supabase
      .from('admin_role_permissions')
      .delete()
      .eq('role_id', params.id)
      .select()

    if (deleteError) {
      defaultLogger.error('Error deleting role permissions:', {
        roleId: params.id,
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint
      })
      throw deleteError
    }

    defaultLogger.info('Deleted existing permissions:', deleteData?.length || 0)

    // Add new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: params.id,
        permission_id: permissionId
      }))

      const { error: insertError, data: insertData } = await supabase
        .from('admin_role_permissions')
        .insert(rolePermissions)
        .select()

      if (insertError) {
        defaultLogger.error('Error inserting role permissions:', {
          roleId: params.id,
          permissionIds: permission_ids,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        throw insertError
      }

      defaultLogger.info('Inserted new permissions:', insertData?.length || 0)
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully'
    })
  } catch (error) {
    defaultLogger.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
