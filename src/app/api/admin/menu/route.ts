/**
 * Admin Menu API Route
 * GET /api/admin/menu - Get user's accessible menu items
 * GET /api/admin/menu?all=true - Get all menu items (for admin management)
 * POST /api/admin/menu - Create a new menu item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  const { searchParams } = new URL(request.url)
  const getAll = searchParams.get('all') === 'true'

  if (getAll) {
    // Return all menu items for admin management - requires admin role
    // Check if user is authenticated and is admin
    let authenticatedUser = user
    
    // If user is anonymous, try to get the actual user from Supabase
    if (user.id === 'anonymous') {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        throw new ApiError('UNAUTHORIZED', 'Authentication required', 401)
      }
      
      authenticatedUser = { id: authUser.id, email: authUser.email }
    }

    const hasAdminRole = await adminService.hasRole(authenticatedUser.id, 'admin') || 
                         await adminService.hasRole(authenticatedUser.id, 'super_admin')

    if (!hasAdminRole) {
      throw new ApiError('FORBIDDEN', 'Admin access required', 403)
    }

    const { data: menuItems, error } = await supabase
        .from('admin_menu_items')
        .select(`
          *,
          permission:admin_permissions(*)
        `)
        .order('sort_order', { ascending: true })

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching menu items:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch menu items', 500)
    }

    return NextResponse.json({ menuItems: menuItems || [] })
  }

  // Return user's accessible menu items (no auth required for this)
  const menuItems = await adminService.getUserMenuItems(user?.id || null)
  
  return NextResponse.json({ menuItems })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  // Only super_admin can create menu items
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can create menu items', 403)
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
      throw new ApiError('VALIDATION_ERROR', 'Label and href are required', 400)
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
      throw new ApiError('CONFLICT', `A menu item with href "${href}" already exists under the same parent`, 409)
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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating menu item', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        body: { label, href, parent_id: finalParentId }
      })
      
      // Check for specific error codes
      if (error.code === '23505') { // Unique violation
        throw new ApiError('CONFLICT', 'A menu item with this href and parent already exists', 409)
      }
      
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message || error.details || 'Database error occurred', 500)
    }

    return NextResponse.json({ menuItem: newItem }, { status: 201 })
}

export const GET = createGetHandler(getHandler, { 
  requireAuth: false, // GET can work without auth for user menu, admin check done manually when getAll=true
  loggerContext: 'api/admin/menu' 
})

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/menu' 
})

