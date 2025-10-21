'use client'

import { ReactNode } from 'react'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'

interface PermissionGuardProps {
  children: ReactNode
  // Use either permission-based or role-based access control
  allowedPermissions?: string[]
  allowedRoles?: string[]
  requireAll?: boolean // For permissions array: require all (AND) or any (OR)
  // Fallback content when access is denied
  fallback?: ReactNode
  // Show loading state
  showLoading?: boolean
  loadingComponent?: ReactNode
}

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions or roles
 */
export function PermissionGuard({
  children,
  allowedPermissions,
  allowedRoles,
  requireAll = false,
  fallback = null,
  showLoading = true,
  loadingComponent
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasRole, hasAnyRole, loading } = useDatabaseRBAC()

  // Show loading state
  if (loading && showLoading) {
    return loadingComponent || (
      <div className="flex items-center gap-2 p-2">
        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = hasAnyRole(allowedRoles)
    if (!hasAllowedRole) {
      return <>{fallback}</>
    }
  }

  // Check multiple permissions
  if (allowedPermissions && allowedPermissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? allowedPermissions.every(p => hasPermission(p))
      : hasAnyPermission(allowedPermissions)
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>
    }
  }

  // If no restrictions specified, allow access
  return <>{children}</>
}

export default PermissionGuard

/**
 * Higher-order component version of PermissionGuard
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <PermissionGuard {...guardProps}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}