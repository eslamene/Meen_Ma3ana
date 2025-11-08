/**
 * Admin Role API Route - Update Role
 * PUT /api/admin/roles/[id] - Update a role
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

    // Only super_admin can update roles
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, display_name_ar, description, description_ar, level } = body

    // SECURITY: Check if role is system role (can't update system roles)
    const { data: existingRole } = await supabase
      .from('admin_roles')
      .select('is_system, name')
      .eq('id', params.id)
      .single()

    if (existingRole?.is_system) {
      return NextResponse.json(
        { error: 'Cannot update system roles' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_roles')
      .update({
        display_name,
        display_name_ar,
        description,
        description_ar,
        level: level !== undefined ? level : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ role: data })
  } catch (error) {
    defaultLogger.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

