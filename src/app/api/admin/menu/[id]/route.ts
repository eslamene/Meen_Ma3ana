/**
 * Admin Menu Item API Route - Update & Delete
 * PUT /api/admin/menu/[id] - Update a menu item
 * DELETE /api/admin/menu/[id] - Delete a menu item
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
    const { permission_id, sort_order, label, label_ar, href, icon, description, is_active, parent_id } = body

    defaultLogger.info('Updating menu item:', {
      menuItemId: params.id,
      bodyFields: Object.keys(body),
      bodyValues: body
    })

    const updateData: Record<string, any> = {
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

    defaultLogger.info('Update data prepared:', {
      menuItemId: params.id,
      updateData,
      updateDataKeys: Object.keys(updateData)
    })

    // Validate that we have at least one field to update
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // First check if the menu item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('admin_menu_items')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (checkError) {
      defaultLogger.error('Error checking menu item existence:', {
        menuItemId: params.id,
        error: checkError,
        errorCode: checkError.code,
        errorMessage: checkError.message,
        errorDetails: checkError.details
      })
      
      return NextResponse.json(
        { 
          error: 'Error checking menu item',
          details: checkError.message || 'Database query failed'
        },
        { status: 500 }
      )
    }

    if (!existingItem) {
      defaultLogger.error('Menu item not found:', {
        menuItemId: params.id
      })
      
      return NextResponse.json(
        { 
          error: 'Menu item not found',
          details: 'The menu item does not exist'
        },
        { status: 404 }
      )
    }

    // Update the menu item
    const { data, error } = await supabase
      .from('admin_menu_items')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      defaultLogger.error('Supabase error updating menu item:', error, {
        menuItemId: params.id,
        updateData,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to update menu item',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
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
        defaultLogger.info('Item likely updated to inactive, RLS blocking SELECT. Update likely succeeded.')
        
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
        defaultLogger.error('Error fetching updated menu item:', fetchError, {
          menuItemId: params.id
        })
        
        return NextResponse.json(
          { 
            error: 'Menu item update may have succeeded but could not verify',
            details: fetchError.message
          },
          { status: 500 }
        )
      }
      
      if (!fetchedData) {
        defaultLogger.error('Menu item not found after update:', {
          menuItemId: params.id,
          updateData
        })
        
        return NextResponse.json(
          { 
            error: 'Menu item update failed',
            details: 'Update completed but item could not be found'
          },
          { status: 500 }
        )
      }
      
      // Return the fetched data
      return NextResponse.json({ menuItem: fetchedData })
    }

    return NextResponse.json({ menuItem: data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    defaultLogger.error('Error updating menu item:', error, {
      errorMessage,
      errorStack
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only super_admin can delete menu items
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    defaultLogger.info('Deleting menu item:', {
      menuItemId: params.id
    })

    // Check if menu item has children
    const { data: children, error: childrenError } = await supabase
      .from('admin_menu_items')
      .select('id')
      .eq('parent_id', params.id)

    if (childrenError) {
      defaultLogger.error('Error checking menu item children:', childrenError, {
        menuItemId: params.id
      })
      
      return NextResponse.json(
        { 
          error: 'Error checking menu item children',
          details: childrenError.message
        },
        { status: 500 }
      )
    }

    if (children && children.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete menu item with children',
          details: 'Please delete or move child menu items first'
        },
        { status: 400 }
      )
    }

    // Check if menu item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('admin_menu_items')
      .select('id, label')
      .eq('id', params.id)
      .maybeSingle()

    if (checkError) {
      defaultLogger.error('Error checking menu item existence:', checkError, {
        menuItemId: params.id
      })
      
      return NextResponse.json(
        { 
          error: 'Error checking menu item',
          details: checkError.message
        },
        { status: 500 }
      )
    }

    if (!existingItem) {
      defaultLogger.error('Menu item not found:', {
        menuItemId: params.id
      })
      
      return NextResponse.json(
        { 
          error: 'Menu item not found',
          details: 'The menu item does not exist'
        },
        { status: 404 }
      )
    }

    // Delete the menu item
    const { data: deletedData, error: deleteError } = await supabase
      .from('admin_menu_items')
      .delete()
      .eq('id', params.id)
      .select()

    if (deleteError) {
      defaultLogger.error('Supabase error deleting menu item:', deleteError, {
        menuItemId: params.id,
        errorCode: deleteError.code,
        errorMessage: deleteError.message,
        errorDetails: deleteError.details,
        errorHint: deleteError.hint
      })
      
      // Check if it's an RLS policy error
      if (deleteError.code === '42501' || deleteError.message?.includes('policy') || deleteError.message?.includes('permission denied')) {
        return NextResponse.json(
          { 
            error: 'Permission denied',
            details: 'You do not have permission to delete menu items. Please ensure you have the super_admin role and that the DELETE policy is configured.',
            code: deleteError.code
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to delete menu item',
          details: deleteError.message,
          code: deleteError.code
        },
        { status: 500 }
      )
    }

    // Verify deletion succeeded
    if (!deletedData || deletedData.length === 0) {
      defaultLogger.warn('Delete returned no data - item may not exist or was already deleted:', {
        menuItemId: params.id
      })
      
      // Still return success if the item doesn't exist (idempotent delete)
      return NextResponse.json({ 
        success: true,
        message: 'Menu item deleted successfully (or did not exist)'
      })
    }

    defaultLogger.info('Menu item deleted successfully:', {
      menuItemId: params.id,
      label: existingItem.label
    })

    return NextResponse.json({ 
      success: true,
      message: 'Menu item deleted successfully'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    defaultLogger.error('Error deleting menu item:', error, {
      errorMessage,
      errorStack
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

