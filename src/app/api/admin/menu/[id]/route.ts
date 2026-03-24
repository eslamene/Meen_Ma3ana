/**
 * Admin Menu Item API Route - Update & Delete
 * PUT /api/admin/menu/[id] - Update a menu item
 * DELETE /api/admin/menu/[id] - Delete a menu item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, user, logger } = context

  // Only super_admin can update menu items
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can update menu items', 403)
  }

    const body = await request.json()
    const { MenuService } = await import('@/lib/services/menuService')

    // Check if menu item exists
    const existingItem = await MenuService.getById(supabase, params.id)
    if (!existingItem) {
      throw new ApiError('NOT_FOUND', 'Menu item not found', 404)
    }

    // Validate that we have at least one field to update
    const updateFields = Object.keys(body).filter(key => key !== 'id')
    if (updateFields.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'No fields to update', 400)
    }

    try {
      const updatedMenuItem = await MenuService.update(supabase, params.id, body)
      return NextResponse.json({ menuItem: updatedMenuItem })
    } catch (error) {
      if (error instanceof Error) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating menu item', { error, menuItemId: params.id })
        
        // Handle RLS case where update succeeds but SELECT fails
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          // Try to fetch separately
          const fetchedItem = await MenuService.getById(supabase, params.id)
          if (fetchedItem) {
            return NextResponse.json({ menuItem: fetchedItem })
          }
          // If still can't fetch, return success with update data
          if (body.is_active === false) {
            return NextResponse.json({ 
              menuItem: {
                id: params.id,
                ...body,
              },
              message: 'Update succeeded but item is now inactive and cannot be fetched due to RLS'
            })
          }
        }
        
        throw new ApiError('INTERNAL_SERVER_ERROR', error.message, 500)
      }
      throw error
    }
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, user, logger } = context

  // Only super_admin can delete menu items
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can delete menu items', 403)
  }

  logger.info('Deleting menu item', {
    menuItemId: params.id
  })

    const { MenuService } = await import('@/lib/services/menuService')

    // Check if menu item exists
    const existingItem = await MenuService.getById(supabase, params.id)
    if (!existingItem) {
      // Idempotent delete - return success if item doesn't exist
      return NextResponse.json({ 
        success: true,
        message: 'Menu item deleted successfully (or did not exist)'
      })
    }

    try {
      await MenuService.delete(supabase, params.id, true) // checkChildren = true
      
      logger.info('Menu item deleted successfully', {
        menuItemId: params.id,
        label: existingItem.label
      })

      return NextResponse.json({ 
        success: true,
        message: 'Menu item deleted successfully'
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('children')) {
          throw new ApiError('VALIDATION_ERROR', error.message, 400)
        }
        if (error.message.includes('policy') || error.message.includes('permission')) {
          throw new ApiError('FORBIDDEN', 'You do not have permission to delete menu items. Please ensure you have the super_admin role and that the DELETE policy is configured.', 403)
        }
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting menu item', { error, menuItemId: params.id })
        throw new ApiError('INTERNAL_SERVER_ERROR', error.message, 500)
      }
      throw error
    }
}

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/menu/[id]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/menu/[id]' 
})

