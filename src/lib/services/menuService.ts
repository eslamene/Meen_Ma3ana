/**
 * Menu Service
 * Handles all menu-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface MenuItem {
  id: string
  label: string
  label_ar?: string | null
  href: string
  icon?: string | null
  description?: string | null
  permission_id?: string | null
  is_active: boolean
  parent_id?: string | null
  sort_order: number
  is_public_nav: boolean
  nav_metadata?: Record<string, unknown> | null
  permission?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface CreateMenuItemData {
  label: string
  label_ar?: string
  href: string
  icon?: string
  description?: string
  permission_id?: string | null
  is_active?: boolean
  parent_id?: string | null
  sort_order?: number
  is_public_nav?: boolean
  nav_metadata?: Record<string, unknown>
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {}

export class MenuService {
  /**
   * Get all menu items (for admin management)
   * @param supabase - Supabase client (server-side only)
   */
  static async getAll(supabase: SupabaseClient): Promise<MenuItem[]> {
    const { data: menuItems, error } = await supabase
      .from('admin_menu_items')
      .select(`
        *,
        permission:admin_permissions(*)
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching menu items:', error)
      throw new Error(`Failed to fetch menu items: ${error.message}`)
    }

    return (menuItems || []) as MenuItem[]
  }

  /**
   * Get public navigation items
   * @param supabase - Supabase client (server-side only)
   */
  static async getPublicNavItems(supabase: SupabaseClient): Promise<MenuItem[]> {
    const { data: menuItems, error } = await supabase
      .from('admin_menu_items')
      .select(`
        id, 
        parent_id,
        label, 
        label_ar, 
        href, 
        icon,
        description,
        sort_order, 
        permission_id,
        nav_metadata,
        is_active,
        is_public_nav,
        created_at,
        updated_at,
        permission:admin_permissions(id, name)
      `)
      .eq('is_public_nav', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching public nav items:', error)
      throw new Error(`Failed to fetch public nav items: ${error.message}`)
    }

    // Transform permission array to single object if needed
    const transformedItems = (menuItems || []).map((item: any) => {
      const permission = Array.isArray(item.permission) ? item.permission[0] : item.permission
      return {
        ...item,
        permission: permission ? { id: permission.id, name: permission.name } : null
      }
    })

    return transformedItems as MenuItem[]
  }

  /**
   * Get menu item by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<MenuItem | null> {
    const { data, error } = await supabase
      .from('admin_menu_items')
      .select(`
        *,
        permission:admin_permissions(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching menu item:', error)
      throw new Error(`Failed to fetch menu item: ${error.message}`)
    }

    return data as MenuItem
  }

  /**
   * Create a new menu item
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreateMenuItemData): Promise<MenuItem> {
    // Validate required fields
    if (!data.label || !data.href) {
      throw new Error('Label and href are required')
    }

    const finalParentId = data.parent_id || null

    // Check if menu item with same href and parent_id already exists
    const { data: existingItem } = await supabase
      .from('admin_menu_items')
      .select('id, label, href')
      .eq('href', data.href)
      .eq('parent_id', finalParentId)
      .maybeSingle()

    if (existingItem) {
      throw new Error('Menu item with this href and parent already exists')
    }

    // Get max sort_order for parent (or root if no parent)
    const { data: maxOrderItem } = await supabase
      .from('admin_menu_items')
      .select('sort_order')
      .eq('parent_id', finalParentId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = data.sort_order !== undefined ? data.sort_order : ((maxOrderItem?.sort_order || 0) + 1)

    // Insert new menu item
    const { data: newMenuItem, error } = await supabase
      .from('admin_menu_items')
      .insert({
        label: data.label,
        label_ar: data.label_ar || null,
        href: data.href,
        icon: data.icon || null,
        description: data.description || null,
        permission_id: data.permission_id || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        parent_id: finalParentId,
        sort_order: sortOrder,
        is_public_nav: data.is_public_nav || false,
        nav_metadata: data.nav_metadata || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        permission:admin_permissions(*)
      `)
      .single()

    if (error) {
      defaultLogger.error('Error creating menu item:', error)
      throw new Error(`Failed to create menu item: ${error.message}`)
    }

    return newMenuItem as MenuItem
  }

  /**
   * Update menu item
   * @param supabase - Supabase client (server-side only)
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdateMenuItemData): Promise<MenuItem> {
    const updateData: Record<string, unknown> = {}

    if (data.label !== undefined) updateData.label = data.label
    if (data.label_ar !== undefined) updateData.label_ar = data.label_ar
    if (data.href !== undefined) updateData.href = data.href
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.description !== undefined) updateData.description = data.description
    if (data.permission_id !== undefined) updateData.permission_id = data.permission_id
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.parent_id !== undefined) updateData.parent_id = data.parent_id
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_public_nav !== undefined) updateData.is_public_nav = data.is_public_nav
    if (data.nav_metadata !== undefined) updateData.nav_metadata = data.nav_metadata

    updateData.updated_at = new Date().toISOString()

    const { data: updatedMenuItem, error } = await supabase
      .from('admin_menu_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        permission:admin_permissions(*)
      `)
      .single()

    if (error) {
      defaultLogger.error('Error updating menu item:', error)
      throw new Error(`Failed to update menu item: ${error.message}`)
    }

    return updatedMenuItem as MenuItem
  }

  /**
   * Check if menu item has children
   * @param supabase - Supabase client (server-side only)
   */
  static async hasChildren(supabase: SupabaseClient, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_menu_items')
      .select('id')
      .eq('parent_id', id)
      .limit(1)

    if (error) {
      defaultLogger.error('Error checking menu item children:', error)
      throw new Error(`Failed to check menu item children: ${error.message}`)
    }

    return (data?.length || 0) > 0
  }

  /**
   * Delete menu item
   * @param supabase - Supabase client (server-side only)
   * @param checkChildren - Whether to check for children before deleting (default: true)
   */
  static async delete(supabase: SupabaseClient, id: string, checkChildren: boolean = true): Promise<void> {
    if (checkChildren) {
      const hasChildren = await this.hasChildren(supabase, id)
      if (hasChildren) {
        throw new Error('Cannot delete menu item with children. Please delete or move child menu items first.')
      }
    }

    const { error } = await supabase
      .from('admin_menu_items')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting menu item:', error)
      throw new Error(`Failed to delete menu item: ${error.message}`)
    }
  }

  /**
   * Reorder menu items (bulk update sort orders)
   * @param supabase - Supabase client (server-side only)
   * @param items - Array of { id, sort_order }
   */
  static async reorder(
    supabase: SupabaseClient,
    items: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required and must not be empty')
    }

    // Update all items
    const updates = await Promise.all(
      items.map((item) =>
        supabase
          .from('admin_menu_items')
          .update({ 
            sort_order: item.sort_order, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', item.id)
      )
    )

    // Check for errors
    const errors = updates.filter(result => result.error)
    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.error?.message).filter(Boolean)
      defaultLogger.error('Error updating menu items:', errors)
      throw new Error(`Failed to update some menu items: ${errorMessages.join(', ')}`)
    }
  }
}

