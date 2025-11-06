'use client'

import React from 'react'
import { useDatabasePermissions } from '@/lib/hooks/useDatabasePermissions'
import AccessDenied from './AccessDenied'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  role?: string
  roles?: string[]
  resource?: string
  action?: string
  fallback?: React.ReactNode
  requireAll?: boolean // If true, user must have ALL permissions/roles. If false, user needs ANY.
}

export default function PermissionGuard({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
  resource,
  action,
  fallback,
  requireAll = false
}: PermissionGuardProps) {
  const { hasPermission, hasRole, loading } = useDatabasePermissions()

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check permissions
  let hasAccess = false

  if (permission || permissions.length > 0) {
    const permsToCheck = permission ? [permission, ...permissions] : permissions
    hasAccess = requireAll 
      ? permsToCheck.every(perm => hasPermission(perm))
      : permsToCheck.some(perm => hasPermission(perm))
  }

  // Check roles
  if (role || roles.length > 0) {
    const rolesToCheck = role ? [role, ...roles] : roles
    const roleAccess = requireAll
      ? rolesToCheck.every(r => hasRole(r))
      : rolesToCheck.some(r => hasRole(r))
    
    // If both permissions and roles are specified, user needs both
    if (permission || permissions.length > 0) {
      hasAccess = hasAccess && roleAccess
    } else {
      hasAccess = roleAccess
    }
  }

  // If no permissions or roles specified, allow access
  if (!permission && permissions.length === 0 && !role && roles.length === 0) {
    hasAccess = true
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <AccessDenied
        requiredPermission={permission || (permissions.length === 1 ? permissions[0] : undefined)}
        requiredRole={role || (roles.length === 1 ? roles[0] : undefined)}
        resource={resource}
        action={action}
      />
    )
  }

  return <>{children}</>
}