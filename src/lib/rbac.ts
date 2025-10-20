// User roles enum
export const userRoles = ['donor', 'sponsor', 'admin'] as const
export type UserRole = typeof userRoles[number]

// Permission definitions
export const permissions = {
  // Case permissions
  'cases:read': ['donor', 'sponsor', 'admin'] as UserRole[],
  'cases:create': ['admin'] as UserRole[],
  'cases:update': ['admin'] as UserRole[],
  'cases:delete': ['admin'] as UserRole[],
  'cases:approve': ['admin'] as UserRole[],
  'cases:assign': ['admin'] as UserRole[],
  
  // Project permissions
  'projects:read': ['donor', 'sponsor', 'admin'] as UserRole[],
  'projects:create': ['admin'] as UserRole[],
  'projects:update': ['admin'] as UserRole[],
  'projects:delete': ['admin'] as UserRole[],
  
  // Contribution permissions
  'contributions:read': ['donor', 'sponsor', 'admin'] as UserRole[],
  'contributions:create': ['donor'] as UserRole[],
  'contributions:update': ['donor', 'admin'] as UserRole[],
  'contributions:approve': ['admin'] as UserRole[],
  'contributions:reject': ['admin'] as UserRole[],
  
  // Sponsorship permissions
  'sponsorships:read': ['sponsor', 'admin'] as UserRole[],
  'sponsorships:create': ['sponsor'] as UserRole[],
  'sponsorships:update': ['sponsor', 'admin'] as UserRole[],
  'sponsorships:approve': ['admin'] as UserRole[],
  'sponsorships:reject': ['admin'] as UserRole[],
  
  // User management permissions
  'users:read': ['admin'] as UserRole[],
  'users:create': ['admin'] as UserRole[],
  'users:update': ['admin'] as UserRole[],
  'users:delete': ['admin'] as UserRole[],
  'users:assign_role': ['admin'] as UserRole[],
  
  // Communication permissions
  'communications:read': ['donor', 'sponsor', 'admin'] as UserRole[],
  'communications:create': ['donor', 'sponsor', 'admin'] as UserRole[],
  'communications:update': ['donor', 'sponsor', 'admin'] as UserRole[],
  
  // Admin permissions
  'admin:access': ['admin'] as UserRole[],
  'admin:reports': ['admin'] as UserRole[],
  'admin:analytics': ['admin'] as UserRole[],
  'admin:settings': ['admin'] as UserRole[],
} as const

export type Permission = keyof typeof permissions

// Role hierarchy (higher roles inherit permissions from lower roles)
export const roleHierarchy: Record<UserRole, UserRole[]> = {
  donor: ['donor'],
  sponsor: ['donor', 'sponsor'],
  admin: ['donor', 'sponsor', 'admin'],
}

// Check if a user has a specific permission
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const allowedRoles = permissions[permission]
  if (!allowedRoles) return false
  
  // Check if user's role is directly allowed
  if (allowedRoles.includes(userRole)) return true
  
  // Check if any of user's inherited roles are allowed
  const inheritedRoles = roleHierarchy[userRole] || []
  return inheritedRoles.some(role => allowedRoles.includes(role))
}

// Get all permissions for a user role
export function getRolePermissions(userRole: UserRole): Permission[] {
  const inheritedRoles = roleHierarchy[userRole] || []
  const allPermissions = new Set<Permission>()
  
  inheritedRoles.forEach(role => {
    Object.entries(permissions).forEach(([permission, allowedRoles]) => {
      if (allowedRoles.includes(role)) {
        allPermissions.add(permission as Permission)
      }
    })
  })
  
  return Array.from(allPermissions)
}

// Check if user can access a resource based on ownership
export function canAccessResource(
  userRole: UserRole,
  resourceOwnerId: string,
  userId: string,
  permission: Permission
): boolean {
  // Admins can access all resources
  if (userRole === 'admin') return true
  
  // Check if user has the permission
  if (!hasPermission(userRole, permission)) return false
  
  // For certain permissions, users can only access their own resources
  const ownerOnlyPermissions: Permission[] = [
    'contributions:update',
    'sponsorships:update',
    'communications:update',
  ]
  
  if (ownerOnlyPermissions.includes(permission)) {
    return resourceOwnerId === userId
  }
  
  return true
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    donor: 'Donor',
    sponsor: 'Sponsor',
    admin: 'Administrator',
  }
  return displayNames[role]
}

// Get role description
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    donor: 'Can make contributions to cases and projects',
    sponsor: 'Can sponsor cases and make contributions',
    admin: 'Full system access and management capabilities',
  }
  return descriptions[role]
}

// Validate role
export function isValidRole(role: string): role is UserRole {
  return userRoles.includes(role as UserRole)
} 