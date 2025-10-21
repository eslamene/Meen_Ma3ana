'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dbRBAC, UserWithRoles, Role, Permission } from '@/lib/rbac/database-rbac'

interface UseRBACReturn {
  user: any
  userRoles: UserWithRoles | null
  roles: Role[]
  permissions: Permission[]
  loading: boolean
  error: string | null
  
  // Permission checks
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  
  // Convenience methods
  canCreateCase: boolean
  canEditCase: boolean
  canDeleteCase: boolean
  canManageUsers: boolean
  canAccessAdmin: boolean
  canManageRBAC: boolean
  canApproveContributions: boolean
  
  // Actions
  refreshUserRoles: () => Promise<void>
}

export function useDatabaseRBAC(): UseRBACReturn {
  const [user, setUser] = useState<any>(null)
  const [userRoles, setUserRoles] = useState<UserWithRoles | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch user roles and permissions
  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const userRolesData = await dbRBAC.getUserRolesAndPermissions(userId)
      setUserRoles(userRolesData)
    } catch (err) {
      console.error('Error fetching user roles:', err)
      setError('Failed to fetch user roles')
    }
  }, [])

  // Fetch all roles and permissions (for admin use)
  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        dbRBAC.getRoles(),
        dbRBAC.getPermissions()
      ])
      setRoles(rolesData)
      setPermissions(permissionsData)
    } catch (err) {
      console.error('Error fetching roles and permissions:', err)
      setError('Failed to fetch roles and permissions')
    }
  }, [])

  // Initialize and listen for auth changes
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('RBAC initialization timeout - using fallback')
            setLoading(false)
            setError('Permission loading timeout - some features may be limited')
          }
        }, 10000) // 10 second timeout

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (mounted) {
          setUser(currentUser)
          
          if (currentUser) {
            // Only fetch user roles for faster loading
            await fetchUserRoles(currentUser.id)
            
            // Fetch roles and permissions in background (non-blocking)
            fetchRolesAndPermissions().catch(err => {
              console.warn('Background fetch failed:', err)
            })
          }
          
          clearTimeout(timeoutId)
        }
      } catch (err) {
        if (mounted) {
          console.error('Error initializing auth:', err)
          setError('Failed to initialize authentication')
          clearTimeout(timeoutId)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          const currentUser = session?.user || null
          setUser(currentUser)
          
          if (currentUser) {
            await fetchUserRoles(currentUser.id)
          } else {
            setUserRoles(null)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [fetchUserRoles, fetchRolesAndPermissions])

  // Permission check functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!userRoles) return false
    return userRoles.permissions.some(p => p.name === permission)
  }, [userRoles])

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!userRoles) return false
    return userRoles.permissions.some(p => permissionList.includes(p.name))
  }, [userRoles])

  const hasRole = useCallback((role: string): boolean => {
    if (!userRoles) return false
    return userRoles.roles.some(r => r.name === role)
  }, [userRoles])

  const hasAnyRole = useCallback((roleList: string[]): boolean => {
    if (!userRoles) return false
    return userRoles.roles.some(r => roleList.includes(r.name))
  }, [userRoles])

  // Convenience permission checks
  const canCreateCase = hasPermission('cases:create')
  const canEditCase = hasPermission('cases:update')
  const canDeleteCase = hasPermission('cases:delete')
  const canManageUsers = hasPermission('admin:users')
  const canAccessAdmin = hasPermission('admin:dashboard')
  const canManageRBAC = hasPermission('admin:rbac')
  const canApproveContributions = hasPermission('contributions:approve')

  // Refresh user roles
  const refreshUserRoles = useCallback(async () => {
    if (user) {
      await fetchUserRoles(user.id)
    }
  }, [user, fetchUserRoles])

  return {
    user,
    userRoles,
    roles,
    permissions,
    loading,
    error,
    
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    
    canCreateCase,
    canEditCase,
    canDeleteCase,
    canManageUsers,
    canAccessAdmin,
    canManageRBAC,
    canApproveContributions,
    
    refreshUserRoles
  }
}

// Legacy compatibility - maps to old usePermissions interface
export function usePermissions() {
  const rbac = useDatabaseRBAC()
  
  return {
    userRole: rbac.userRoles?.roles[0]?.name || null,
    hasPermission: rbac.hasPermission,
    canCreateCase: rbac.canCreateCase,
    canEditCase: rbac.canEditCase,
    canDeleteCase: rbac.canDeleteCase,
    canManageUsers: rbac.canManageUsers,
    canAccessAdmin: rbac.canAccessAdmin,
    canApproveContributions: rbac.canApproveContributions,
    loading: rbac.loading
  }
}
