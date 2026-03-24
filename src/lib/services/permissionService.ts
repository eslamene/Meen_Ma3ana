/**
 * Permission Service
 * Handles all permission-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Permission {
  id: string
  name: string
  display_name: string | null
  display_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  resource: string
  action: string
  is_system: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string | null
}

export interface CreatePermissionData {
  name: string
  display_name: string
  display_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  resource: string
  action: string
  is_system?: boolean
  is_active?: boolean
}

export interface UpdatePermissionData {
  display_name?: string
  display_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  is_active?: boolean
}

export class PermissionService {
  /**
   * Get all permissions
   * @param supabase - Supabase client (server-side only)
   * @param includeInactive - Whether to include inactive permissions
   */
  static async getAll(supabase: SupabaseClient, includeInactive: boolean = false): Promise<Permission[]> {
    let query = supabase
      .from('admin_permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error fetching permissions:', error)
      throw new Error(`Failed to fetch permissions: ${error.message}`)
    }

    return (data || []) as Permission[]
  }

  /**
   * Get permission by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Permission ID
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<Permission | null> {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching permission:', error)
      throw new Error(`Failed to fetch permission: ${error.message}`)
    }

    return data as Permission | null
  }

  /**
   * Get permission by name
   * @param supabase - Supabase client (server-side only)
   * @param name - Permission name
   */
  static async getByName(supabase: SupabaseClient, name: string): Promise<Permission | null> {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching permission by name:', error)
      throw new Error(`Failed to fetch permission: ${error.message}`)
    }

    return data as Permission | null
  }

  /**
   * Create a new permission
   * @param supabase - Supabase client (server-side only)
   * @param data - Permission data
   */
  static async create(supabase: SupabaseClient, data: CreatePermissionData): Promise<Permission> {
    // Check if permission with same name already exists
    const existing = await this.getByName(supabase, data.name)
    if (existing) {
      throw new Error(`Permission with name "${data.name}" already exists`)
    }

    const { data: newPermission, error } = await supabase
      .from('admin_permissions')
      .insert({
        name: data.name,
        display_name: data.display_name,
        display_name_ar: data.display_name_ar || null,
        description: data.description || null,
        description_ar: data.description_ar || null,
        resource: data.resource,
        action: data.action,
        is_system: data.is_system || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating permission:', error)
      throw new Error(`Failed to create permission: ${error.message}`)
    }

    return newPermission as Permission
  }

  /**
   * Update a permission
   * @param supabase - Supabase client (server-side only)
   * @param id - Permission ID
   * @param data - Update data
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdatePermissionData): Promise<Permission> {
    // Check if permission is system (can't update system permissions)
    const existing = await this.getById(supabase, id)
    if (!existing) {
      throw new Error(`Permission not found: ${id}`)
    }

    if (existing.is_system) {
      throw new Error('Cannot update system permissions')
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (data.display_name !== undefined) updateData.display_name = data.display_name
    if (data.display_name_ar !== undefined) updateData.display_name_ar = data.display_name_ar
    if (data.description !== undefined) updateData.description = data.description
    if (data.description_ar !== undefined) updateData.description_ar = data.description_ar
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: updatedPermission, error } = await supabase
      .from('admin_permissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating permission:', error)
      throw new Error(`Failed to update permission: ${error.message}`)
    }

    return updatedPermission as Permission
  }

  /**
   * Delete a permission
   * @param supabase - Supabase client (server-side only)
   * @param id - Permission ID
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    // Check if permission is system (can't delete system permissions)
    const existing = await this.getById(supabase, id)
    if (!existing) {
      throw new Error(`Permission not found: ${id}`)
    }

    if (existing.is_system) {
      throw new Error('Cannot delete system permissions')
    }

    const { error } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting permission:', error)
      throw new Error(`Failed to delete permission: ${error.message}`)
    }
  }
}

