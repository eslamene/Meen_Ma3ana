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
    const { permission_id, sort_order, label, label_ar, href, icon, description, is_active, parent_id, is_public_nav, nav_metadata } = body

    logger.info('Updating menu item', {
      menuItemId: params.id,
      bodyFields: Object.keys(body),
      bodyValues: body
    })

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (permission_id !== undefined) updateData.permission_id = permission_id || null
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (label !== undefined) updateData.label = label
    if (label_ar !== undefined) updateData.label_ar = label_ar || null
    if (href !== undefined) updateData.href = href
    if (icon !== undefined) updateData.icon = icon || null
    if (description !== undefined) updateData.description = description || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (parent_id !== undefined) updateData.parent_id = parent_id || null
    if (is_public_nav !== undefined) updateData.is_public_nav = is_public_nav || false
    if (nav_metadata !== undefined) updateData.nav_metadata = nav_metadata || {}

    defaultLogger.info('Update data prepared:', {
      menuItemId: params.id,
      updateData,
      updateDataKeys: Object.keys(updateData)
    })

    // Validate that we have at least one field to update
    if (Object.keys(updateData).length === 1) {
      throw new ApiError('VALIDATION_ERROR', 'No fields to update', 400)
    }

    // First check if the menu item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('admin_menu_items')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (checkError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking menu item existence', {
        menuItemId: params.id,
        error: checkError,
        errorCode: checkError.code,
        errorMessage: checkError.message,
        errorDetails: checkError.details
      })
      
      throw new ApiError('INTERNAL_SERVER_ERROR', checkError.message || 'Database query failed', 500)
    }

    if (!existingItem) {
      throw new ApiError('NOT_FOUND', 'Menu item not found', 404)
    }

    // Update the menu item
    const { data, error } = await supabase
      .from('admin_menu_items')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Supabase error updating menu item', {
        menuItemId: params.id,
        updateData,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      })
      
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update menu item: ${error.message}`, 500)
    }

    // If data is null, try to fetch the item separately to verify update
    // This can happen if RLS policies prevent selecting after update
    // (e.g., if is_active was set to false, RLS might block the SELECT)
    if (!data) {
      defaultLogger.warn('Update returned no data, fetching item separately:', {
        menuItemId: params.id,
        updateData,
        isActiveBeingSetToFalse: updateData.is_active === false
      })
      
      // Try fetching with RLS bypass for super_admin (using service role would be better, but this works)
      // First try normal fetch
      let fetchedData = null
      let fetchError = null
      
      const { data: normalData, error: normalError } = await supabase
        .from('admin_menu_items')
        .select('*')
        .eq('id', params.id)
        .maybeSingle()
      
      if (normalData) {
        fetchedData = normalData
      } else if (normalError) {
        fetchError = normalError
      }
      
      // If normal fetch failed and we're setting is_active to false, 
      // the update likely succeeded but RLS is blocking the SELECT
      if (!fetchedData && updateData.is_active === false && !fetchError) {
        logger.info('Item likely updated to inactive, RLS blocking SELECT. Update likely succeeded.')
        
        // Return success with the update data we sent (since we can't fetch it back)
        return NextResponse.json({ 
          menuItem: {
            id: params.id,
            ...updateData,
            // We don't have all fields, but the update succeeded
          },
          message: 'Update succeeded but item is now inactive and cannot be fetched due to RLS'
        })
      }
      
      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching updated menu item', {
          menuItemId: params.id,
          error: fetchError
        })
        
        throw new ApiError('INTERNAL_SERVER_ERROR', 'Menu item update may have succeeded but could not verify', 500)
      }
      
      if (!fetchedData) {
        logger.error('Menu item not found after update', {
          menuItemId: params.id,
          updateData
        })
        
        throw new ApiError('INTERNAL_SERVER_ERROR', 'Update completed but item could not be found', 500)
      }
      
      // Return the fetched data
      return NextResponse.json({ menuItem: fetchedData })
    }

    return NextResponse.json({ menuItem: data })
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

    // Check if menu item has children
    const { data: children, error: childrenError } = await supabase
      .from('admin_menu_items')
      .select('id')
      .eq('parent_id', params.id)

    if (childrenError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking menu item children', {
        menuItemId: params.id,
        error: childrenError
      })
      
      throw new ApiError('INTERNAL_SERVER_ERROR', childrenError.message || 'Error checking menu item children', 500)
    }

    if (children && children.length > 0) {
      throw new ApiError('VALIDATION_ERROR', 'Cannot delete menu item with children. Please delete or move child menu items first', 400)
    }

    // Check if menu item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('admin_menu_items')
      .select('id, label')
      .eq('id', params.id)
      .maybeSingle()

    if (checkError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking menu item existence', {
        menuItemId: params.id,
        error: checkError
      })
      
      throw new ApiError('INTERNAL_SERVER_ERROR', checkError.message || 'Error checking menu item', 500)
    }

    if (!existingItem) {
      throw new ApiError('NOT_FOUND', 'Menu item not found', 404)
    }

    // Delete the menu item
    const { data: deletedData, error: deleteError } = await supabase
      .from('admin_menu_items')
      .delete()
      .eq('id', params.id)
      .select()

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Supabase error deleting menu item', {
        menuItemId: params.id,
        errorCode: deleteError.code,
        errorMessage: deleteError.message,
        errorDetails: deleteError.details,
        errorHint: deleteError.hint
      })
      
      // Check if it's an RLS policy error
      if (deleteError.code === '42501' || deleteError.message?.includes('policy') || deleteError.message?.includes('permission denied')) {
        throw new ApiError('FORBIDDEN', 'You do not have permission to delete menu items. Please ensure you have the super_admin role and that the DELETE policy is configured.', 403)
      }
      
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to delete menu item: ${deleteError.message}`, 500)
    }

    // Verify deletion succeeded
    if (!deletedData || deletedData.length === 0) {
      logger.warn('Delete returned no data - item may not exist or was already deleted', {
        menuItemId: params.id
      })
      
      // Still return success if the item doesn't exist (idempotent delete)
      return NextResponse.json({ 
        success: true,
        message: 'Menu item deleted successfully (or did not exist)'
      })
    }

    logger.info('Menu item deleted successfully', {
      menuItemId: params.id,
      label: existingItem.label
    })

    return NextResponse.json({ 
      success: true,
      message: 'Menu item deleted successfully'
    })
}

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/menu/[id]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/menu/[id]' 
})

