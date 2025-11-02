/**
 * Database-Driven Permissions Hook
 * Replaces the hardcoded permissions system with database-driven RBAC
 */

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { defaultLogger } from '@/lib/logger'

import { 
  DatabaseUserRole, 
  DatabasePermission, 
  DatabasePermissionModule,
  databaseRBAC 
} from '@/lib/rbac/database-permissions'

export interface UseDatabasePermissionsReturn {
  user: User | null
  loading: boolean
  roles: DatabaseUserRole[]
  permissions: DatabasePermission[]
  modules: DatabasePermissionModule[]
  
  // Permission checking functions
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  canPerformAction: (resource: string, action: string) => boolean
  
  // Specific permission checks for common actions
  canCreateCase: boolean
  canEditCase: boolean
  canDeleteCase: boolean
  canApproveCase: boolean
  canCreateContribution: boolean
  canApproveContribution: boolean
  canRejectContribution: boolean
  canAccessAdminDashboard: boolean
  canAccessAnalytics: boolean
  canManageUsers: boolean
  canCreateProject: boolean
  canEditProject: boolean
  canDeleteProject: boolean
  canCreateSponsorship: boolean
  canApproveSponsorship: boolean
  
  // Utility functions
  refreshPermissions: () => Promise<void>
  clearCache: () => void
}

export function useDatabasePermissions(): UseDatabasePermissionsReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<DatabaseUserRole[]>([])
  const [permissions, setPermissions] = useState<DatabasePermission[]>([])
  const [modules, setModules] = useState<DatabasePermissionModule[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  const supabase = createClient()

  // Fetch user data and permissions
  const fetchUserData = useCallback(async () => {
    if (hasFetched) return

    try {
      setLoading(true)
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // Fetch user roles and permissions in parallel
        const [userRoles, userPermissions, permissionModules] = await Promise.all([
          databaseRBAC.getUserRoles(currentUser.id),
          databaseRBAC.getUserPermissions(currentUser.id),
          databaseRBAC.getPermissionModules()
        ])

        setRoles(userRoles)
        setPermissions(userPermissions)
        setModules(permissionModules)
      } else {
        setRoles([])
        setPermissions([])
        setModules([])
      }
    } catch (error) {
      defaultLogger.error('Error fetching user data:', error)
      setRoles([])
      setPermissions([])
      setModules([])
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [supabase.auth, hasFetched])

  // Initial data fetch
  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setHasFetched(false) // Reset to fetch new user data
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Permission checking functions
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.some(p => p.name === permission)
  }, [permissions])

  const hasAnyPermission = useCallback((permissionsToCheck: string[]): boolean => {
    return permissionsToCheck.some(permission => 
      permissions.some(p => p.name === permission)
    )
  }, [permissions])

  const hasAllPermissions = useCallback((permissionsToCheck: string[]): boolean => {
    return permissionsToCheck.every(permission => 
      permissions.some(p => p.name === permission)
    )
  }, [permissions])

  const hasRole = useCallback((role: string): boolean => {
    return roles.some(r => r.name === role)
  }, [roles])

  const hasAnyRole = useCallback((rolesToCheck: string[]): boolean => {
    return rolesToCheck.some(role => 
      roles.some(r => r.name === role)
    )
  }, [roles])

  const canPerformAction = useCallback((resource: string, action: string): boolean => {
    return permissions.some(p => 
      p.resource === resource && p.action === action
    )
  }, [permissions])

  // Specific permission checks for common actions
  const canCreateCase = hasPermission('cases:create')
  const canEditCase = hasPermission('cases:update')
  const canDeleteCase = hasPermission('cases:delete')
  const canApproveCase = hasPermission('cases:approve')
  
  const canCreateContribution = hasPermission('contributions:create')
  const canApproveContribution = hasPermission('contributions:approve')
  const canRejectContribution = hasPermission('contributions:reject')
  
  const canAccessAdminDashboard = hasPermission('admin:dashboard')
  const canAccessAnalytics = hasPermission('admin:analytics')
  const canManageUsers = hasPermission('users:manage')
  
  const canCreateProject = hasPermission('projects:create')
  const canEditProject = hasPermission('projects:update')
  const canDeleteProject = hasPermission('projects:delete')
  
  const canCreateSponsorship = hasPermission('sponsorships:create')
  const canApproveSponsorship = hasPermission('sponsorships:approve')

  // Utility functions
  const refreshPermissions = useCallback(async () => {
    setHasFetched(false)
    await fetchUserData()
  }, [fetchUserData])

  const clearCache = useCallback(() => {
    databaseRBAC.clearCache()
    setHasFetched(false)
  }, [])

  return {
    user,
    loading,
    roles,
    permissions,
    modules,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canPerformAction,
    canCreateCase,
    canEditCase,
    canDeleteCase,
    canApproveCase,
    canCreateContribution,
    canApproveContribution,
    canRejectContribution,
    canAccessAdminDashboard,
    canAccessAnalytics,
    canManageUsers,
    canCreateProject,
    canEditProject,
    canDeleteProject,
    canCreateSponsorship,
    canApproveSponsorship,
    refreshPermissions,
    clearCache
  }
}

/**
 * Hook for checking specific permissions (useful for components)
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useDatabasePermissions()
  return hasPermission(permission)
}

/**
 * Hook for checking specific roles (useful for components)
 */
export function useRole(role: string): boolean {
  const { hasRole } = useDatabasePermissions()
  return hasRole(role)
}

/**
 * Hook for checking multiple permissions (useful for complex components)
 */
export function usePermissions(permissions: string[]): {
  hasAll: boolean
  hasAny: boolean
  hasPermission: (permission: string) => boolean
} {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = useDatabasePermissions()
  
  return {
    hasAll: hasAllPermissions(permissions),
    hasAny: hasAnyPermission(permissions),
    hasPermission
  }
}
