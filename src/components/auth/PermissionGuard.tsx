'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Permission, UserRole } from '@/lib/rbac/permissions'

interface PermissionGuardProps {
  children: ReactNode
  // Use either permission-based or role-based access control
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean // For permissions array: require all (AND) or any (OR)
  allowedRoles?: UserRole[]
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
export default function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  allowedRoles,
  fallback = null,
  showLoading = true,
  loadingComponent = <div className="animate-pulse">Loading...</div>
}: PermissionGuardProps) {
  const {
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRoleAllowed
  } = usePermissions()
  
  // Show loading state
  if (loading && showLoading) {
    return <>{loadingComponent}</>
  }
  
  // Check permissions
  let hasAccess = false
  
  if (permission) {
    // Single permission check
    hasAccess = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  } else if (allowedRoles && allowedRoles.length > 0) {
    // Role-based check
    hasAccess = isRoleAllowed(allowedRoles)
  } else {
    // No restrictions specified, allow access
    hasAccess = true
  }
  
  // Render children if access is granted, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>
}

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