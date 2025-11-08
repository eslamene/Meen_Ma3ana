/**
 * Admin Permissions API Route
 * GET /api/admin/permissions - Get all permissions
 * POST /api/admin/permissions - Create a permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
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

    const permissions = await adminService.getPermissions()
    return NextResponse.json({ permissions })
  } catch (error) {
    defaultLogger.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create permissions
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, display_name, display_name_ar, description, description_ar, resource, action } = body

    if (!name || !display_name || !resource || !action) {
      return NextResponse.json(
        { error: 'Name, display_name, resource, and action are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .insert({
        name,
        display_name,
        display_name_ar,
        description,
        description_ar,
        resource,
        action,
        is_system: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ permission: data })
  } catch (error) {
    defaultLogger.error('Error creating permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
