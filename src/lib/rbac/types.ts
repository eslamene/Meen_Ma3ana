/**
 * RBAC Type Definitions
 * This file contains only type definitions for the RBAC system
 * All actual permission data is now stored in the database
 */

import { defaultLogger } from '@/lib/logger'

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
  | 'users:manage'
  
  // Admin Functions
  | 'admin:dashboard'
  | 'admin:analytics'
  | 'admin:settings'
  | 'admin:rbac'
  | 'admin:users'
  | 'admin:permissions'
  | 'admin:cases'
  | 'admin:contributions'
  
  // Sponsorship Management
  | 'sponsorships:create'
  | 'sponsorships:read'
  | 'sponsorships:update'
  | 'sponsorships:approve'
  | 'sponsorships:reject'
  
  // Project Management
  | 'projects:create'
  | 'projects:read'
  | 'projects:update'
  | 'projects:delete'
  
  // Beneficiary Management
  | 'beneficiaries:create'
  | 'beneficiaries:read'
  | 'beneficiaries:update'
  | 'beneficiaries:delete'
  
  // Profile Management
  | 'profile:read'
  | 'profile:update'
  
  // Notifications
  | 'notifications:read'
  | 'notifications:create'
  | 'notifications:update'
  
  // Reports
  | 'reports:read'
  | 'reports:export'
  
  // Files
  | 'files:read'
  | 'files:upload'
  | 'files:delete'
  
  // Payments
  | 'payments:read'
  | 'payments:process'
  
  // Messages
  | 'messages:read'
  | 'messages:create'
  | 'messages:update'

/**
 * Legacy permission checking functions (deprecated)
 * These are kept for backward compatibility but now use database
 * @deprecated Use useDatabasePermissions hook instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function hasPermission(_userRole: UserRole | undefined, permission: Permission): boolean {
  defaultLogger.warn('hasPermission is deprecated. Use useDatabasePermissions hook instead.')
  return false
}

export function hasAnyPermission(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  defaultLogger.warn('hasAnyPermission is deprecated. Use useDatabasePermissions hook instead.')
  return false
}

export function hasAllPermissions(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  defaultLogger.warn('hasAllPermissions is deprecated. Use useDatabasePermissions hook instead.')
  return false
}

export function canPerformAction(
  userRole: UserRole | undefined,
  resource: string,
  action: string
): boolean {
  defaultLogger.warn('canPerformAction is deprecated. Use useDatabasePermissions hook instead.')
  return false
}

export function isRoleAllowed(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  defaultLogger.warn('isRoleAllowed is deprecated. Use useDatabasePermissions hook instead.')
  return false
}

/**
 * Legacy permission configuration (deprecated)
 * @deprecated All permissions are now managed in the database
 */
export const PERMISSION_CONFIG = {
  CASE_CREATION_ROLES: ['admin', 'moderator'] as UserRole[],
  CONTRIBUTION_APPROVAL_ROLES: ['admin', 'moderator'] as UserRole[],
  ADMIN_DASHBOARD_ROLES: ['admin'] as UserRole[],
  ANALYTICS_ACCESS_ROLES: ['admin', 'moderator'] as UserRole[],
  USER_MANAGEMENT_ROLES: ['admin'] as UserRole[],
  PROJECT_MANAGEMENT_ROLES: ['admin', 'moderator', 'volunteer'] as UserRole[],
} as const

/**
 * Legacy role permissions mapping (deprecated)
 * @deprecated All role-permission mappings are now stored in the database
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [],
  moderator: [],
  sponsor: [],
  volunteer: [],
  donor: [],
}

/**
 * Legacy role definitions (deprecated)
 * @deprecated Use database roles instead
 */
export const userRoles = ['donor', 'sponsor', 'admin', 'moderator', 'volunteer'] as const

/**
 * Get role display name (legacy function)
 * @deprecated Use database role display_name instead
 */
export function getRoleDisplayName(role: UserRole): string {
  defaultLogger.warn('getRoleDisplayName is deprecated. Use database role display_name instead.')
  const displayNames: Record<UserRole, string> = {
    donor: 'Donor',
    sponsor: 'Sponsor',
    admin: 'Administrator',
    moderator: 'Moderator',
    volunteer: 'Volunteer',
  }
  return displayNames[role] || role
}

/**
 * Get role description (legacy function)
 * @deprecated Use database role description instead
 */
export function getRoleDescription(role: UserRole): string {
  defaultLogger.warn('getRoleDescription is deprecated. Use database role description instead.')
  const descriptions: Record<UserRole, string> = {
    donor: 'Can make contributions to cases and projects',
    sponsor: 'Can sponsor cases and make contributions',
    admin: 'Full system access and management capabilities',
    moderator: 'Can moderate content and manage cases',
    volunteer: 'Can help with case management and projects',
  }
  return descriptions[role] || `${role} role`
}

/**
 * Validate role (legacy function)
 * @deprecated Use database role validation instead
 */
export function isValidRole(role: string): role is UserRole {
  defaultLogger.warn('isValidRole is deprecated. Use database role validation instead.')
  return userRoles.includes(role as UserRole)
}
