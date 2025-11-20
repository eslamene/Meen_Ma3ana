/**
 * Admin Menu API Route
 * GET /api/admin/menu - Get user's accessible menu items
 * GET /api/admin/menu?all=true - Get all menu items (for admin management)
 * POST /api/admin/menu - Create a new menu item
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create menu items
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden',
        details: 'Only super_admin can create menu items'
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      label, 
      label_ar, 
      href, 
      icon, 
      description, 
      permission_id, 
      is_active = true, 
      parent_id, 
      sort_order,
      is_public_nav = false,
      nav_metadata = {}
    } = body

    // Validate required fields
    if (!label || !href) {
      return NextResponse.json(
        { error: 'Label and href are required' },
        { status: 400 }
      )
    }

    const finalParentId = parent_id || null

    // Check if menu item with same href and parent_id already exists
    const { data: existingItem } = await supabase
      .from('admin_menu_items')
      .select('id, label, href')
      .eq('href', href)
      .eq('parent_id', finalParentId)
      .maybeSingle()

    if (existingItem) {
      return NextResponse.json(
        { 
          error: 'Menu item already exists',
          details: `A menu item with href "${href}" already exists under the same parent`
        },
        { status: 409 }
      )
    }

    // Get max sort_order for the parent if not provided
    let finalSortOrder = sort_order
    if (finalSortOrder === undefined) {
      const { data: siblings } = await supabase
        .from('admin_menu_items')
        .select('sort_order')
        .eq('parent_id', finalParentId)
        .order('sort_order', { ascending: false })
        .limit(1)

      finalSortOrder = siblings && siblings.length > 0 
        ? siblings[0].sort_order + 1 
        : 0
    }

    // Create the menu item
    const { data: newItem, error } = await supabase
      .from('admin_menu_items')
      .insert({
        label,
        label_ar: label_ar || null,
        href,
        icon: icon || null,
        description: description || null,
        permission_id: permission_id || null,
        is_active,
        parent_id: finalParentId,
        sort_order: finalSortOrder,
        is_public_nav: is_public_nav || false,
        nav_metadata: nav_metadata || {}
      })
      .select(`
        *,
        permission:admin_permissions(*)
      `)
      .single()

    if (error) {
      defaultLogger.error('Error creating menu item:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        body: { label, href, parent_id: finalParentId }
      })
      
      // Check for specific error codes
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { 
            error: 'Menu item already exists',
            details: 'A menu item with this href and parent already exists'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create menu item',
          details: error.message || error.details || 'Database error occurred'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ menuItem: newItem }, { status: 201 })
  } catch (error) {
    defaultLogger.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

