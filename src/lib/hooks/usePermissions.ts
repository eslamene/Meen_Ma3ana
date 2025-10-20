'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { 
  UserRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  canPerformAction,
  isRoleAllowed,
  PERMISSION_CONFIG
} from '@/lib/rbac/permissions'

interface UsePermissionsReturn {
  user: User | null
  userRole: UserRole | undefined
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canPerformAction: (resource: string, action: string) => boolean
  isRoleAllowed: (allowedRoles: UserRole[]) => boolean
  canCreateCase: boolean
  canApproveContributions: boolean
  canAccessAdminDashboard: boolean
  canAccessAnalytics: boolean
  canManageUsers: boolean
  canManageProjects: boolean
}

/**
 * Custom hook for permission checking
 * Provides easy access to user permissions throughout the app
 */
export function usePermissions(): UsePermissionsReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  
  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    getUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    return () => subscription.unsubscribe()
  }, [supabase.auth])
  
  // Get user role from user metadata
  const userRole = user?.user_metadata?.role as UserRole | undefined
  
  // Permission checking functions
  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(userRole, permission)
  }
  
  const checkAnyPermission = (permissions: Permission[]): boolean => {
    return hasAnyPermission(userRole, permissions)
  }
  
  const checkAllPermissions = (permissions: Permission[]): boolean => {
    return hasAllPermissions(userRole, permissions)
  }
  
  const checkCanPerformAction = (resource: string, action: string): boolean => {
    return canPerformAction(userRole, resource, action)
  }
  
  const checkIsRoleAllowed = (allowedRoles: UserRole[]): boolean => {
    return isRoleAllowed(userRole, allowedRoles)
  }
  
  // Specific permission checks for common actions
  const canCreateCase = checkIsRoleAllowed(PERMISSION_CONFIG.CASE_CREATION_ROLES)
  const canApproveContributions = checkIsRoleAllowed(PERMISSION_CONFIG.CONTRIBUTION_APPROVAL_ROLES)
  const canAccessAdminDashboard = checkIsRoleAllowed(PERMISSION_CONFIG.ADMIN_DASHBOARD_ROLES)
  const canAccessAnalytics = checkIsRoleAllowed(PERMISSION_CONFIG.ANALYTICS_ACCESS_ROLES)
  const canManageUsers = checkIsRoleAllowed(PERMISSION_CONFIG.USER_MANAGEMENT_ROLES)
  const canManageProjects = checkIsRoleAllowed(PERMISSION_CONFIG.PROJECT_MANAGEMENT_ROLES)
  
  return {
    user,
    userRole,
    loading,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    canPerformAction: checkCanPerformAction,
    isRoleAllowed: checkIsRoleAllowed,
    canCreateCase,
    canApproveContributions,
    canAccessAdminDashboard,
    canAccessAnalytics,
    canManageUsers,
    canManageProjects,
  }
}
