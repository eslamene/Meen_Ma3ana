/**
 * Legacy RBAC types - kept for backward compatibility
 * New code should use @/lib/admin/types instead
 */

export type UserRole = 'donor' | 'sponsor' | 'admin'

export const userRoles: UserRole[] = ['donor', 'sponsor', 'admin']

export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    donor: 'Donor',
    sponsor: 'Sponsor',
    admin: 'Administrator'
  }
  return roleNames[role] || role
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    donor: 'Can make donations to cases',
    sponsor: 'Can sponsor cases and beneficiaries',
    admin: 'Can manage the platform'
  }
  return descriptions[role] || ''
}

