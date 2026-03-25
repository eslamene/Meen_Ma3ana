/**
 * Admin Menu API Route
 * GET /api/admin/menu - List menu items (supports ?all=true)
 * POST /api/admin/menu - Create a menu item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'
import { MenuService } from '@/lib/services/menuService'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'

  try {
    // Current admin pages request all=true, but we keep the toggle
    // for future compatibility with filtered/public variants.
    const menuItems = all
      ? await MenuService.getAll(supabase)
      : await MenuService.getAll(supabase)

    return NextResponse.json({ menuItems })
  } catch (error) {
    logger.error('Error fetching admin menu items', error, {
      area: 'admin-menu',
      operation: 'getHandler',
      all,
    })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch menu items', 500)
  }
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can create menu items', 403)
  }

  const body = await request.json()

  try {
    const menuItem = await MenuService.create(supabase, body)
    return NextResponse.json({ menuItem }, { status: 201 })
  } catch (error) {
    logger.error('Error creating admin menu item', error, {
      area: 'admin-menu',
      operation: 'postHandler',
    })

    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ApiError('VALIDATION_ERROR', error.message, 400)
    }

    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create menu item', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/menu',
})

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/menu',
})

