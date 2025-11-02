'use client'

import { User } from '@supabase/supabase-js'
import { useDatabasePermissions } from './useDatabasePermissions'
import { UserRole, Permission } from '@/lib/rbac/types'

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
  const {
    user,
    loading,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canPerformAction,
    hasRole,
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
    canApproveSponsorship
  } = useDatabasePermissions()

  // Get user role from database roles (fallback to first role)
  const userRole = roles.length > 0 ? roles[0].name as UserRole : undefined

  // Permission checking functions (wrapper for backward compatibility)
  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(permission)
  }
  
  const checkAnyPermission = (permissions: Permission[]): boolean => {
    return hasAnyPermission(permissions)
  }
  
  const checkAllPermissions = (permissions: Permission[]): boolean => {
    return hasAllPermissions(permissions)
  }
  
  const checkCanPerformAction = (resource: string, action: string): boolean => {
    return canPerformAction(resource, action)
  }
  
  const checkIsRoleAllowed = (allowedRoles: UserRole[]): boolean => {
    return hasRole(allowedRoles[0]) // Check if user has any of the allowed roles
  }
  
  // Specific permission checks for common actions (using database permissions)
  const canApproveContributions = canApproveContribution
  const canManageProjects = canCreateProject || canEditProject || canDeleteProject
  
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
