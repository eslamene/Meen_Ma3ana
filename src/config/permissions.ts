/**
 * Permission Configuration
 * This file allows easy modification of role permissions without touching the core RBAC system
 */

import { UserRole } from '@/lib/rbac/permissions'

/**
 * Feature Access Configuration
 * Modify these arrays to change which roles can access specific features
 */
export const FEATURE_ACCESS = {
  // Case Management
  CASE_CREATION: ['admin', 'moderator'] as UserRole[],
  CASE_EDITING: ['admin', 'moderator'] as UserRole[],
  CASE_DELETION: ['admin'] as UserRole[],
  CASE_APPROVAL: ['admin', 'moderator'] as UserRole[],
  
  // Contribution Management
  CONTRIBUTION_APPROVAL: ['admin', 'moderator'] as UserRole[],
  CONTRIBUTION_REJECTION: ['admin', 'moderator'] as UserRole[],
  
  // Administrative Features
  ADMIN_DASHBOARD: ['admin'] as UserRole[],
  ANALYTICS_ACCESS: ['admin', 'moderator'] as UserRole[],
  USER_MANAGEMENT: ['admin'] as UserRole[],
  
  // Project Management
  PROJECT_CREATION: ['admin', 'moderator', 'volunteer'] as UserRole[],
  PROJECT_EDITING: ['admin', 'moderator', 'volunteer'] as UserRole[],
  
  // Sponsorship Features
  SPONSORSHIP_REQUESTS: ['sponsor', 'admin'] as UserRole[],
  SPONSORSHIP_APPROVAL: ['admin'] as UserRole[],
} as const

/**
 * UI Element Visibility Configuration
 * Control which UI elements are visible to which roles
 */
export const UI_VISIBILITY = {
  // Navigation Items
  ADMIN_NAV: ['admin'] as UserRole[],
  MODERATOR_NAV: ['admin', 'moderator'] as UserRole[],
  SPONSOR_NAV: ['admin', 'sponsor'] as UserRole[],
  
  // Action Buttons
  CREATE_CASE_BUTTON: ['admin', 'moderator'] as UserRole[],
  DELETE_CASE_BUTTON: ['admin'] as UserRole[],
  APPROVE_CONTRIBUTION_BUTTON: ['admin', 'moderator'] as UserRole[],
  
  // Data Views
  ALL_CONTRIBUTIONS_VIEW: ['admin', 'moderator'] as UserRole[],
  USER_MANAGEMENT_VIEW: ['admin'] as UserRole[],
  ANALYTICS_VIEW: ['admin', 'moderator'] as UserRole[],
} as const

/**
 * Default Role Assignment
 * What role new users get by default
 */
export const DEFAULT_USER_ROLE: UserRole = 'donor'

/**
 * Role Hierarchy (higher number = more permissions)
 * Used for role comparison and inheritance
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  donor: 1,
  volunteer: 2,
  sponsor: 3,
  moderator: 4,
  admin: 5,
}

/**
 * Check if a role has higher or equal permissions than another role
 */
export function hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Get all roles that have equal or higher permissions than the specified role
 */
export function getRolesWithEqualOrHigherPermissions(role: UserRole): UserRole[] {
  const roleLevel = ROLE_HIERARCHY[role]
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level >= roleLevel)
    .map(([roleName]) => roleName as UserRole)
}
