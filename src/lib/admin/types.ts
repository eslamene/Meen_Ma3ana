/**
 * Clean Administration System Types
 * Simple, clean type definitions for the new administration system
 */

export type AdminRole = {
  id: string
  name: string
  display_name: string
  display_name_ar?: string
  description?: string
  description_ar?: string
  level: number
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AdminPermission = {
  id: string
  name: string
  display_name: string
  display_name_ar?: string
  description?: string
  description_ar?: string
  resource: string
  action: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AdminRolePermission = {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export type AdminUserRole = {
  id: string
  user_id: string
  role_id: string
  assigned_by?: string
  assigned_at: string
  expires_at?: string
  is_active: boolean
}

export type AdminMenuItem = {
  id: string
  parent_id?: string
  label: string
  label_ar?: string
  href: string
  icon?: string
  description?: string
  description_ar?: string
  sort_order: number
  permission_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  children?: AdminMenuItem[]
}

export type AdminMenuItemWithPermission = AdminMenuItem & {
  permission?: AdminPermission
}

export type UserRoleWithDetails = AdminUserRole & {
  role: AdminRole
}

export type RoleWithPermissions = AdminRole & {
  permissions: AdminPermission[]
}

export type PermissionWithRoles = AdminPermission & {
  roles: AdminRole[]
}

// Role names enum
export const ROLE_NAMES = {
  PUBLIC: 'public', // Public role for unauthenticated users (formerly 'visitor')
  VISITOR: 'visitor', // Deprecated: use PUBLIC instead
  DONOR: 'donor',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES]

// Common permission names
export const PERMISSION_NAMES = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_ANALYTICS: 'dashboard:analytics',
  
  // Cases
  CASES_VIEW: 'cases:view',
  CASES_CREATE: 'cases:create',
  CASES_UPDATE: 'cases:update',
  CASES_DELETE: 'cases:delete',
  CASES_MANAGE: 'cases:manage',
  
  // Contributions
  CONTRIBUTIONS_VIEW: 'contributions:view',
  CONTRIBUTIONS_CREATE: 'contributions:create',
  CONTRIBUTIONS_APPROVE: 'contributions:approve',
  CONTRIBUTIONS_MANAGE: 'contributions:manage',
  
  // Admin
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_ANALYTICS: 'admin:analytics',
  
  // Storage
  MANAGE_FILES: 'manage:files',
  
  // Profile
  PROFILE_VIEW: 'profile:view',
  PROFILE_UPDATE: 'profile:update',
} as const

export type PermissionName = typeof PERMISSION_NAMES[keyof typeof PERMISSION_NAMES]

