/**
 * Admin Permission API Route - Create/Update/Delete
 * POST /api/admin/permissions - Create permission
 * PUT /api/admin/permissions/[id] - Update permission
 * DELETE /api/admin/permissions/[id] - Delete permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'
import { RouteContext } from '@/types/next-api'

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

    // Only super_admin can update permissions
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, display_name_ar, description, description_ar } = body

    // Check if permission is system (can't update system permissions)
    const { data: existingPermission } = await supabase
      .from('admin_permissions')
      .select('is_system')
      .eq('id', params.id)
      .single()

    if (existingPermission?.is_system) {
      return NextResponse.json(
        { error: 'Cannot update system permissions' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .update({
        display_name,
        display_name_ar,
        description,
        description_ar,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ permission: data })
  } catch (error) {
    defaultLogger.error('Error updating permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only super_admin can delete permissions
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if permission is system (can't delete system permissions)
    const { data: existingPermission } = await supabase
      .from('admin_permissions')
      .select('is_system')
      .eq('id', params.id)
      .single()

    if (existingPermission?.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system permissions' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    defaultLogger.error('Error deleting permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

