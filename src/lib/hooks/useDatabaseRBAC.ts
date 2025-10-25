'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dbRBAC, UserWithRoles, Role, Permission } from '@/lib/rbac/database-rbac'
import { User } from '@supabase/supabase-js'

interface UseRBACReturn {
  user: User | null
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
  const [user, setUser] = useState<User | null>(null)
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
      console.error('❌ Error fetching user roles:', err)
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
    let refreshIntervalId: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (mounted) {
          setUser(currentUser)
          
          if (currentUser) {
            await fetchUserRoles(currentUser.id)
            fetchRolesAndPermissions().catch(() => {}) // Background fetch, ignore errors
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Error initializing RBAC:', err)
          setError('Failed to initialize authentication')
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
          
          // Ensure loading is false after auth state change
          setLoading(false)
        }
      }
    )

    // Periodic session refresh to prevent expiration
    // Refresh session every 5 minutes (Supabase default is 60 minutes)
    refreshIntervalId = setInterval(async () => {
      if (mounted) {
        try {
          // Refresh the session
          const { data: { session }, error } = await supabase.auth.refreshSession()
          
          if (error) {
            console.warn('Session refresh failed:', error)
            // If refresh fails, try to get current user
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (currentUser) {
              // Session is still valid, refresh roles
              await fetchUserRoles(currentUser.id)
            } else {
              // Session expired, clear state
              setUser(null)
              setUserRoles(null)
            }
          } else if (session?.user) {
            // Session refreshed successfully, update roles
            await fetchUserRoles(session.user.id)
          }
        } catch (err) {
          console.error('Error during periodic refresh:', err)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Listen for window focus to refresh permissions
    const handleWindowFocus = async () => {
      if (mounted) {
        try {
          // Check if session is still valid
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            await fetchUserRoles(currentUser.id)
          }
        } catch (err) {
          console.error('Error refreshing on window focus:', err)
        }
      }
    }

    window.addEventListener('focus', handleWindowFocus)

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
      }
      window.removeEventListener('focus', handleWindowFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Memoized convenience permission checks to prevent unnecessary recalculations
  const canCreateCase = useMemo(() => hasPermission('cases:create'), [hasPermission])
  const canEditCase = useMemo(() => hasPermission('cases:update'), [hasPermission])
  const canDeleteCase = useMemo(() => hasPermission('cases:delete'), [hasPermission])
  const canManageUsers = useMemo(() => hasPermission('admin:users'), [hasPermission])
  const canAccessAdmin = useMemo(() => hasPermission('admin:dashboard'), [hasPermission])
  const canManageRBAC = useMemo(() => hasPermission('admin:rbac'), [hasPermission])
  const canApproveContributions = useMemo(() => hasPermission('contributions:approve'), [hasPermission])

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
