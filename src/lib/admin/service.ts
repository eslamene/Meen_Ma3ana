/**
 * Clean Administration Service
 * Server-side service for managing roles, permissions, and menu access
 */

import { createClient } from '@/lib/supabase/server'
import { defaultLogger } from '@/lib/logger'
import type {
  AdminRole,
  AdminPermission,
  AdminMenuItem,
  UserRoleWithDetails,
  RoleWithPermissions,
} from './types'

export class AdminService {
  /**
   * Get all active roles
   */
  async getRoles(): Promise<AdminRole[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      defaultLogger.error('Error fetching roles:', error)
      return []
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<AdminRole | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      defaultLogger.error('Error fetching role:', error)
      return null
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(roleName: string): Promise<AdminRole | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('name', roleName)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      defaultLogger.error('Error fetching role:', error)
      return null
    }
  }

  /**
   * Get role with permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
    try {
      const supabase = await createClient()
      
      // Get role
      const { data: role, error: roleError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError
      if (!role) return null

      // Get permissions
      const { data: permissions, error: permError } = await supabase
        .from('admin_role_permissions')
        .select(`
          permission_id,
          admin_permissions (*)
        `)
        .eq('role_id', roleId)

      if (permError) throw permError

      return {
        ...role,
        permissions: (permissions || []).map((rp: any) => rp.admin_permissions).filter(Boolean),
      }
    } catch (error) {
      defaultLogger.error('Error fetching role with permissions:', error)
      return null
    }
  }

  /**
   * Get all active permissions
   */
  async getPermissions(): Promise<AdminPermission[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('is_active', true)
        .order('resource', { ascending: true })
        .order('action', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      defaultLogger.error('Error fetching permissions:', error)
      return []
    }
  }

  /**
   * Get permission by name
   */
  async getPermissionByName(permissionName: string): Promise<AdminPermission | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('name', permissionName)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      defaultLogger.error('Error fetching permission:', error)
      return null
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<UserRoleWithDetails[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('admin_user_roles')
        .select(`
          *,
          admin_roles (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      
      return (data || []).map((ur: any) => ({
        ...ur,
        role: ur.admin_roles,
      }))
    } catch (error) {
      defaultLogger.error('Error fetching user roles:', error)
      return []
    }
  }

  /**
   * Get user's role names
   */
  async getUserRoleNames(userId: string): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId)
    return userRoles.map(ur => ur.role.name)
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId: string): Promise<AdminPermission[]> {
    try {
      const supabase = await createClient()
      
      // Get user's roles
      const userRoles = await this.getUserRoles(userId)
      if (userRoles.length === 0) return []

      const roleIds = userRoles.map(ur => ur.role_id)

      // Get permissions for these roles
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select(`
          permission_id,
          admin_permissions (*)
        `)
        .in('role_id', roleIds)

      if (error) throw error

      // Extract unique permissions
      const permissionMap = new Map<string, AdminPermission>()
      ;(data || []).forEach((rp: any) => {
        if (rp.admin_permissions) {
          permissionMap.set(rp.admin_permissions.id, rp.admin_permissions)
        }
      })

      return Array.from(permissionMap.values())
    } catch (error) {
      defaultLogger.error('Error fetching user permissions:', error)
      return []
    }
  }

  /**
   * Get user's permission names
   */
  async getUserPermissionNames(userId: string): Promise<string[]> {
    const permissions = await this.getUserPermissions(userId)
    return permissions.map(p => p.name)
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.rpc('user_has_permission', {
        user_id: userId,
        permission_name: permissionName,
      })

      if (error) throw error
      return data === true
    } catch (error) {
      defaultLogger.error('Error checking permission:', error)
      // Fallback to checking permissions directly
      const permissionNames = await this.getUserPermissionNames(userId)
      return permissionNames.includes(permissionName)
    }
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.rpc('user_has_role', {
        user_id: userId,
        role_name: roleName,
      })

      if (error) throw error
      return data === true
    } catch (error) {
      defaultLogger.error('Error checking role:', error)
      // Fallback to checking roles directly
      const roleNames = await this.getUserRoleNames(userId)
      return roleNames.includes(roleName)
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const userRoleNames = await this.getUserRoleNames(userId)
    return roleNames.some(roleName => userRoleNames.includes(roleName))
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const userPermissionNames = await this.getUserPermissionNames(userId)
    return permissionNames.some(permissionName => userPermissionNames.includes(permissionName))
  }

  /**
   * Get user's accessible menu items
   */
  async getUserMenuItems(userId: string | null): Promise<AdminMenuItem[]> {
    try {
      const supabase = await createClient()
      
      if (!userId) {
        // Return public menu items only
        const { data, error } = await supabase
          .from('admin_menu_items')
          .select('*')
          .eq('is_active', true)
          .is('permission_id', null)
          .order('sort_order', { ascending: true })

        if (error) throw error
        return this.buildMenuTree(data || [])
      }

      // Get user's accessible menu items using the function
      const { data, error } = await supabase.rpc('get_user_menu_items', {
        user_id: userId,
      })

      if (error) throw error
      
      // Build menu tree structure
      return this.buildMenuTree(data || [])
    } catch (error) {
      defaultLogger.error('Error fetching menu items:', error)
      return []
    }
  }

  /**
   * Build menu tree from flat list
   */
  private buildMenuTree(items: AdminMenuItem[]): AdminMenuItem[] {
    const itemMap = new Map<string, AdminMenuItem>()
    const rootItems: AdminMenuItem[] = []

    // Create map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Build tree structure
    items.forEach(item => {
      const menuItem = itemMap.get(item.id)!
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(menuItem)
        }
      } else {
        rootItems.push(menuItem)
      }
    })

    // Sort items
    const sortItems = (items: AdminMenuItem[]) => {
      items.sort((a, b) => a.sort_order - b.sort_order)
      items.forEach(item => {
        if (item.children) {
          sortItems(item.children)
        }
      })
    }

    sortItems(rootItems)
    return rootItems
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy?: string,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error, data } = await supabase
        .from('admin_user_roles')
        .upsert({
          user_id: userId,
          role_id: roleId,
          assigned_by: assignedBy,
          expires_at: expiresAt || null,
          is_active: true,
        }, {
          onConflict: 'user_id,role_id',
        })
        .select()

      if (error) {
        defaultLogger.error('Error assigning role:', {
          userId,
          roleId,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      return true
    } catch (error) {
      defaultLogger.error('Error assigning role:', error)
      return false
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error, data } = await supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .select()

      if (error) {
        defaultLogger.error('Error removing role:', {
          userId,
          roleId,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      return true
    } catch (error) {
      defaultLogger.error('Error removing role:', error)
      return false
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('admin_role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId,
        })

      if (error) throw error
      return true
    } catch (error) {
      defaultLogger.error('Error assigning permission:', error)
      return false
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)

      if (error) throw error
      return true
    } catch (error) {
      defaultLogger.error('Error removing permission:', error)
      return false
    }
  }
}

// Export singleton instance
export const adminService = new AdminService()

