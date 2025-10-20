/**
 * Dynamic Role-Based Access Control (RBAC) System
 * This module provides flexible permission management for different user roles
 */

export type UserRole = 'admin' | 'sponsor' | 'donor' | 'moderator' | 'volunteer'

export type Permission = 
  // Case Management
  | 'cases:create'
  | 'cases:read'
  | 'cases:update'
  | 'cases:delete'
  | 'cases:approve'
  | 'cases:publish'
  
  // Contribution Management
  | 'contributions:create'
  | 'contributions:read'
  | 'contributions:update'
  | 'contributions:approve'
  | 'contributions:reject'
  
  // User Management
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  
  // Admin Functions
  | 'admin:dashboard'
  | 'admin:analytics'
  | 'admin:settings'
  
  // Sponsorship Management
  | 'sponsorships:create'
  | 'sponsorships:read'
  | 'sponsorships:update'
  | 'sponsorships:approve'
  
  // Project Management
  | 'projects:create'
  | 'projects:read'
  | 'projects:update'
  | 'projects:delete'

/**
 * Role-Permission Mapping
 * Define what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'cases:create',
    'cases:read',
    'cases:update',
    'cases:delete',
    'cases:approve',
    'cases:publish',
    'contributions:create',
    'contributions:read',
    'contributions:update',
    'contributions:approve',
    'contributions:reject',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'admin:dashboard',
    'admin:analytics',
    'admin:settings',
    'sponsorships:create',
    'sponsorships:read',
    'sponsorships:update',
    'sponsorships:approve',
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
  ],
  
  moderator: [
    // Can manage cases and contributions but not users
    'cases:create',
    'cases:read',
    'cases:update',
    'cases:approve',
    'cases:publish',
    'contributions:read',
    'contributions:approve',
    'contributions:reject',
    'projects:read',
    'projects:update',
    'sponsorships:read',
    'sponsorships:update',
  ],
  
  sponsor: [
    // Can create sponsorship requests and view analytics
    'cases:read',
    'contributions:create',
    'contributions:read',
    'sponsorships:create',
    'sponsorships:read',
    'sponsorships:update',
    'projects:read',
  ],
  
  volunteer: [
    // Can help with case management but limited permissions
    'cases:read',
    'cases:update',
    'contributions:read',
    'projects:read',
    'projects:update',
  ],
  
  donor: [
    // Basic user permissions - can donate and view
    'cases:read',
    'contributions:create',
    'contributions:read',
    'projects:read',
  ],
}

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: UserRole | undefined, permission: Permission): boolean {
  if (!userRole) return false
  
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  return rolePermissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false
  
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false
  
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || []
}

/**
 * Check if a role can perform a specific action on a resource
 */
export function canPerformAction(
  userRole: UserRole | undefined,
  resource: string,
  action: string
): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(userRole, permission)
}

/**
 * Permission configuration that can be easily modified
 * This allows for dynamic permission updates without code changes
 */
export const PERMISSION_CONFIG = {
  // Case creation restrictions
  CASE_CREATION_ROLES: ['admin', 'moderator'] as UserRole[],
  
  // Contribution approval roles
  CONTRIBUTION_APPROVAL_ROLES: ['admin', 'moderator'] as UserRole[],
  
  // Admin dashboard access
  ADMIN_DASHBOARD_ROLES: ['admin'] as UserRole[],
  
  // Analytics access
  ANALYTICS_ACCESS_ROLES: ['admin', 'moderator'] as UserRole[],
  
  // User management access
  USER_MANAGEMENT_ROLES: ['admin'] as UserRole[],
  
  // Project management access
  PROJECT_MANAGEMENT_ROLES: ['admin', 'moderator', 'volunteer'] as UserRole[],
}

/**
 * Check if user role is in allowed roles list
 */
export function isRoleAllowed(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}
