/**
 * Admin Menu Reorder API Route
 * PUT /api/admin/menu/reorder - Bulk update menu item sort orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

export async function PUT(request: NextRequest) {
  try {
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
    const { items } = body // Array of { id, sort_order }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Update all items
    const updates = await Promise.all(
      items.map((item: { id: string; sort_order: number }) =>
        supabase
          .from('admin_menu_items')
          .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .select()
          .single()
      )
    )

    // Check for errors
    const errors = updates.filter(result => result.error)
    if (errors.length > 0) {
      defaultLogger.error('Error updating menu items:', errors)
      return NextResponse.json(
        { error: 'Some items failed to update' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    defaultLogger.error('Error updating menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

