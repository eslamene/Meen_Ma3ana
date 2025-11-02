import { Eye, Plus, Edit, Trash, Shield, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Type definitions
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  hierarchy_level?: number;
  permissions_count?: number;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
  module_id: string;
  is_system: boolean;
  roles_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  permissions_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Generates a properly formatted permission name in the format "action:resource".
 * @param action - The action part of the permission (e.g., "view", "create")
 * @param resource - The resource part of the permission (e.g., "cases", "users")
 * @returns The formatted permission name
 * @example
 * generatePermissionName("view", "cases") // returns "view:cases"
 */
export function generatePermissionName(action: string, resource: string): string {
  return `${action}:${resource}`;
}

/**
 * Parses a permission name into its action and resource components.
 * @param name - The permission name in "action:resource" format
 * @returns An object with action and resource properties
 * @throws Error if the name is not in the correct format
 * @example
 * parsePermissionName("view:cases") // returns { action: "view", resource: "cases" }
 */
export function parsePermissionName(name: string): { action: string; resource: string } {
  const parts = name.split(':');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    throw new Error(`Invalid permission name format: ${name}. Expected "action:resource"`);
  }
  return { action: parts[0], resource: parts[1] };
}

/**
 * Validates if a permission name follows the correct "action:resource" format.
 * @param name - The permission name to validate
 * @returns True if valid, false otherwise
 * @example
 * validatePermissionName("view:cases") // returns true
 * validatePermissionName("invalid") // returns false
 */
export function validatePermissionName(name: string): boolean {
  try {
    parsePermissionName(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts text to a lowercase slug with underscores instead of spaces.
 * @param text - The text to slugify
 * @returns The slugified text
 * @example
 * slugify("Admin User") // returns "admin_user"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Returns a Tailwind CSS color class for a given action type.
 * @param action - The action type (view, create, update, delete, manage, approve, reject)
 * @returns The Tailwind color class
 * @example
 * getActionColor("view") // returns "text-blue-500"
 */
export function getActionColor(action: string): string {
  const colorMap: Record<string, string> = {
    view: 'text-blue-500',
    create: 'text-green-500',
    update: 'text-yellow-500',
    delete: 'text-red-500',
    manage: 'text-purple-500',
    approve: 'text-emerald-500',
    reject: 'text-orange-500',
  };
  return colorMap[action.toLowerCase()] || 'text-gray-500';
}

/**
 * Returns the appropriate Lucide icon for a given action type.
 * @param action - The action type (view, create, update, delete, manage, approve, reject)
 * @returns The Lucide icon component
 * @example
 * getActionIcon("view") // returns Eye icon
 */
export function getActionIcon(action: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    view: Eye,
    create: Plus,
    update: Edit,
    delete: Trash,
    manage: Shield,
    approve: CheckCircle,
    reject: XCircle,
  };
  return iconMap[action.toLowerCase()] || Shield;
}

/**
 * Sorts roles by their hierarchy level in ascending order.
 * @param roles - Array of roles to sort
 * @returns The sorted array of roles
 * @example
 * sortRolesByHierarchy([{ hierarchy_level: 2 }, { hierarchy_level: 1 }]) // returns roles with level 1 first
 */
export function sortRolesByHierarchy(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => (a.hierarchy_level || 0) - (b.hierarchy_level || 0));
}

/**
 * Checks if a role can be deleted based on its system status and user count.
 * @param role - The role to check
 * @param userCount - Number of users assigned to this role
 * @returns An object indicating if deletion is allowed and the reason if not
 * @example
 * canDeleteRole({ is_system: true }, 0) // returns { canDelete: false, reason: "Cannot delete system roles" }
 */
export function canDeleteRole(role: Role, userCount: number): { canDelete: boolean; reason?: string } {
  if (role.is_system) {
    return { canDelete: false, reason: 'Cannot delete system roles' };
  }
  if (userCount > 0) {
    return { canDelete: false, reason: `Role is assigned to ${userCount} user${userCount === 1 ? '' : 's'}` };
  }
  return { canDelete: true };
}

/**
 * Checks if a permission can be deleted based on its system status and role count.
 * @param permission - The permission to check
 * @param roleCount - Number of roles that have this permission
 * @returns An object indicating if deletion is allowed and the reason if not
 * @example
 * canDeletePermission({ is_system: true }, 0) // returns { canDelete: false, reason: "Cannot delete system permissions" }
 */
export function canDeletePermission(permission: Permission, roleCount: number): { canDelete: boolean; reason?: string } {
  if (permission.is_system) {
    return { canDelete: false, reason: 'Cannot delete system permissions' };
  }
  if (roleCount > 0) {
    return { canDelete: false, reason: `Permission is assigned to ${roleCount} role${roleCount === 1 ? '' : 's'}` };
  }
  return { canDelete: true };
}

/**
 * Generates a human-readable description for a role.
 * @param role - The role to format
 * @returns A formatted description string
 * @example
 * formatRoleDescription({ display_name: "Admin", permissions_count: 10 }) // returns "Admin - 10 permissions"
 */
export function formatRoleDescription(role: Role): string {
  const permissionsText = role.permissions_count ? `${role.permissions_count} permission${role.permissions_count === 1 ? '' : 's'}` : 'no permissions';
  return `${role.display_name} - ${permissionsText}`;
}

/**
 * Groups permissions by their action type.
 * @param permissions - Array of permissions to group
 * @returns An object with actions as keys and arrays of permissions as values
 * @example
 * getPermissionsByAction([{ action: "view" }, { action: "create" }]) // returns { view: [...], create: [...] }
 */
export function getPermissionsByAction(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    const action = permission.action;
    if (!acc[action]) {
      acc[action] = [];
    }
    acc[action].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

/**
 * Groups permissions by their resource type.
 * @param permissions - Array of permissions to group
 * @returns An object with resources as keys and arrays of permissions as values
 * @example
 * getPermissionsByResource([{ resource: "cases" }, { resource: "users" }]) // returns { cases: [...], users: [...] }
 */
export function getPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    const resource = permission.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

/**
 * Calculates the percentage of permissions assigned to a role out of all permissions.
 * @param rolePermissions - Permissions assigned to the role
 * @param allPermissions - All available permissions
 * @returns The coverage percentage (0-100)
 * @example
 * calculatePermissionCoverage([{ id: "1" }], [{ id: "1" }, { id: "2" }]) // returns 50
 */
export function calculatePermissionCoverage(rolePermissions: Permission[], allPermissions: Permission[]): number {
  if (allPermissions.length === 0) return 0;
  return Math.round((rolePermissions.length / allPermissions.length) * 100);
}