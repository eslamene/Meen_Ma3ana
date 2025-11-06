/**
 * Database-Driven RBAC System
 * This module provides permission management using the database RBAC tables
 * instead of hardcoded permissions
 */

import { createClient } from '@/lib/supabase/client'

import { defaultLogger } from '@/lib/logger'

export type DatabaseUserRole = {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
}

export type DatabasePermission = {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
  module_id?: string
}

export type DatabasePermissionModule = {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

// Types for Supabase nested query results
interface RbacPermissionQueryResult {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
  module_id?: string
}

interface RbacRolePermissionQueryResult {
  rbac_permissions: RbacPermissionQueryResult | RbacPermissionQueryResult[] | null
}

interface RbacRoleQueryResult {
  rbac_role_permissions: RbacRolePermissionQueryResult | RbacRolePermissionQueryResult[] | null
}

interface UserRoleQueryResult {
  rbac_roles: RbacRoleQueryResult | RbacRoleQueryResult[] | null
}

// Type for user roles query result (simpler structure)
interface UserRoleWithRole {
  rbac_roles: DatabaseUserRole | DatabaseUserRole[] | null
}

/**
 * Database RBAC Service
 * Handles all RBAC operations using the database
 */
export class DatabaseRBACService {
  private _supabase: ReturnType<typeof createClient> | null = null
  private permissionCache = new Map<string, DatabasePermission[]>()
  private roleCache = new Map<string, DatabaseUserRole[]>()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate = 0

  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    if (!this._supabase) {
      if (typeof window === 'undefined') {
        throw new Error('DatabaseRBACService can only be used in client-side code')
      }
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Get all permissions from database
   */
  async getPermissions(): Promise<DatabasePermission[]> {
    if (this.isCacheValid() && this.permissionCache.has('all')) {
      return this.permissionCache.get('all')!
    }

    try {
      const { data, error } = await this.supabase
        .from('rbac_permissions')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const permissions = data || []
      this.permissionCache.set('all', permissions)
      this.lastCacheUpdate = Date.now()
      
      return permissions
    } catch (error) {
      defaultLogger.error('Error fetching permissions:', error)
      return []
    }
  }

  /**
   * Get all roles from database
   */
  async getRoles(): Promise<DatabaseUserRole[]> {
    if (this.isCacheValid() && this.roleCache.has('all')) {
      return this.roleCache.get('all')!
    }

    try {
      const { data, error } = await this.supabase
        .from('rbac_roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const roles = data || []
      this.roleCache.set('all', roles)
      this.lastCacheUpdate = Date.now()
      
      return roles
    } catch (error) {
      defaultLogger.error('Error fetching roles:', error)
      return []
    }
  }

  /**
   * Get user's roles from database
   */
  async getUserRoles(userId: string): Promise<DatabaseUserRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('rbac_user_roles')
        .select(`
          rbac_roles (
            id,
            name,
            display_name,
            description,
            is_system
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error

      // Cast to typed structure (Supabase returns nested relationships as arrays)
      const typedData = (data || []) as unknown as UserRoleWithRole[]
      
      return typedData
        .flatMap((ur: UserRoleWithRole) => {
          const roles = Array.isArray(ur.rbac_roles)
            ? ur.rbac_roles
            : ur.rbac_roles ? [ur.rbac_roles] : []
          return roles
        })
        .filter((role): role is DatabaseUserRole => Boolean(role))
    } catch (error) {
      defaultLogger.error('Error fetching user roles:', error)
      return []
    }
  }

  /**
   * Get user's permissions from database
   */
  async getUserPermissions(userId: string): Promise<DatabasePermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('rbac_user_roles')
        .select(`
          rbac_roles (
            rbac_role_permissions (
              rbac_permissions (
                id,
                name,
                display_name,
                description,
                resource,
                action,
                is_system,
                module_id
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error

      // Cast to typed structure (Supabase returns nested relationships as arrays)
      const typedData = (data || []) as unknown as UserRoleQueryResult[]
      
      const permissions: DatabasePermission[] = typedData
        .flatMap((ur: UserRoleQueryResult) => {
          const roles = Array.isArray(ur.rbac_roles) 
            ? ur.rbac_roles 
            : ur.rbac_roles ? [ur.rbac_roles] : []
          
          return roles.flatMap((role: RbacRoleQueryResult) => {
            const rolePermissions = Array.isArray(role.rbac_role_permissions)
              ? role.rbac_role_permissions
              : role.rbac_role_permissions ? [role.rbac_role_permissions] : []
            
            return rolePermissions
              .map((rp: RbacRolePermissionQueryResult) => {
                const permissions = Array.isArray(rp.rbac_permissions)
                  ? rp.rbac_permissions
                  : rp.rbac_permissions ? [rp.rbac_permissions] : []
                
                return permissions
              })
              .flat()
          })
        })
        .filter((p): p is DatabasePermission => Boolean(p))

      return permissions
    } catch (error) {
      defaultLogger.error('Error fetching user permissions:', error)
      return []
    }
  }

  /**
   * Get permissions by module
   */
  async getPermissionsByModule(moduleId: string): Promise<DatabasePermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('rbac_permissions')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      return data || []
    } catch (error) {
      defaultLogger.error('Error fetching permissions by module:', error)
      return []
    }
  }

  /**
   * Get all permission modules
   */
  async getPermissionModules(): Promise<DatabasePermissionModule[]> {
    try {
      const { data, error } = await this.supabase
        .from('rbac_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error

      return data || []
    } catch (error) {
      defaultLogger.error('Error fetching permission modules:', error)
      return []
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      return permissions.some(p => p.name === permissionName)
    } catch (error) {
      defaultLogger.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      return permissionNames.some(permissionName => 
        permissions.some(p => p.name === permissionName)
      )
    } catch (error) {
      defaultLogger.error('Error checking any permission:', error)
      return false
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      return permissionNames.every(permissionName => 
        permissions.some(p => p.name === permissionName)
      )
    } catch (error) {
      defaultLogger.error('Error checking all permissions:', error)
      return false
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId)
      return roles.some(r => r.name === roleName)
    } catch (error) {
      defaultLogger.error('Error checking role:', error)
      return false
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId)
      return roleNames.some(roleName => 
        roles.some(r => r.name === roleName)
      )
    } catch (error) {
      defaultLogger.error('Error checking any role:', error)
      return false
    }
  }

  /**
   * Check if user can perform action on resource
   */
  async canPerformAction(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      return permissions.some(p => 
        p.resource === resource && p.action === action
      )
    } catch (error) {
      defaultLogger.error('Error checking action permission:', error)
      return false
    }
  }

  /**
   * Get role hierarchy level (if implemented in database)
   */
  async getRoleHierarchyLevel(userId: string): Promise<number> {
    try {
      const roles = await this.getUserRoles(userId)
      if (roles.length === 0) return 0
      
      // For now, return a simple hierarchy based on role names
      // This can be enhanced with a proper hierarchy table
      const hierarchy: Record<string, number> = {
        'donor': 1,
        'volunteer': 2,
        'sponsor': 3,
        'moderator': 4,
        'admin': 5
      }
      
      return Math.max(...roles.map(r => hierarchy[r.name] || 0))
    } catch (error) {
      defaultLogger.error('Error getting role hierarchy:', error)
      return 0
    }
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear()
    this.roleCache.clear()
    this.lastCacheUpdate = 0
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry
  }
}

// Export singleton instance
export const databaseRBAC = new DatabaseRBACService()

/**
 * Convenience functions for backward compatibility
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  return databaseRBAC.hasPermission(userId, permission)
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  return databaseRBAC.hasAnyPermission(userId, permissions)
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  return databaseRBAC.hasAllPermissions(userId, permissions)
}

export async function hasRole(userId: string, role: string): Promise<boolean> {
  return databaseRBAC.hasRole(userId, role)
}

export async function hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
  return databaseRBAC.hasAnyRole(userId, roles)
}

export async function canPerformAction(userId: string, resource: string, action: string): Promise<boolean> {
  return databaseRBAC.canPerformAction(userId, resource, action)
}
