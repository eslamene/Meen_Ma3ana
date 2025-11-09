/**
 * Admin Menu Item API Route - Update
 * PUT /api/admin/menu/[id] - Update a menu item
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

    // Only super_admin can update menu items
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { permission_id } = body

    const { data, error } = await supabase
      .from('admin_menu_items')
      .update({
        permission_id: permission_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ menuItem: data })
  } catch (error) {
    defaultLogger.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

