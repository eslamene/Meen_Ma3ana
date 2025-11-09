/**
 * Admin Menu API Route
 * GET /api/admin/menu - Get user's accessible menu items
 * GET /api/admin/menu?all=true - Get all menu items (for admin management)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const getAll = searchParams.get('all') === 'true'

    if (getAll) {
      // Return all menu items for admin management
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user has admin role
      const hasAdminRole = await adminService.hasRole(user.id, 'admin') || 
                           await adminService.hasRole(user.id, 'super_admin')

      if (!hasAdminRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: menuItems, error } = await supabase
        .from('admin_menu_items')
        .select(`
          *,
          permission:admin_permissions(*)
        `)
        .order('sort_order', { ascending: true })

      if (error) throw error

      return NextResponse.json({ menuItems: menuItems || [] })
    }

    // Return user's accessible menu items
    const menuItems = await adminService.getUserMenuItems(user?.id || null)
    
    return NextResponse.json({ menuItems })
  } catch (error) {
    defaultLogger.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

