import useSWR, { mutate } from 'swr'

// TypeScript types
export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system: boolean
  sort_order: number
  user_count?: number
  permissions?: Permission[]
}

export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system: boolean
  module?: Module
}

export interface Module {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_system: boolean
  permissions_count?: number
}

export interface User {
  id: string
  email: string
  display_name: string
  created_at?: string
  roles?: Role[]
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface UserWithRoles extends User {
  roles: Role[]
}

export interface PermissionsByModule {
  [moduleName: string]: {
    module: Module
    permissions: Permission[]
  }
}

// SWR configuration
const swrConfig = {
  revalidateOnFocus: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

/**
 * Hook to fetch all roles
 * @returns { data: Role[], error, isLoading, isValidating, mutate }
 */
export function useRoles() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/rbac/roles', fetcher, swrConfig)
  return {
    data: data?.roles || [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Hook to fetch permissions grouped by module
 * @returns { data: PermissionsByModule, error, isLoading, isValidating, mutate }
 */
export function usePermissions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/rbac/permissions', fetcher, swrConfig)
  return {
    data: data?.permissionsByModule || {},
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Hook to fetch all modules
 * @returns { data: Module[], error, isLoading, isValidating, mutate }
 */
export function useModules() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/rbac/modules', fetcher, swrConfig)
  return {
    data: data?.modules || [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Hook to fetch users with role assignments
 * @returns { data: UserWithRoles[], error, isLoading, isValidating, mutate }
 */
export function useUsers() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/admin/rbac/users', fetcher, swrConfig)
  return {
    data: data?.users || [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Hook to fetch a specific role with permissions
 * @param roleId - The ID of the role
 * @returns { data: RoleWithPermissions | null, error, isLoading, isValidating, mutate }
 */
export function useRoleDetails(roleId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    roleId ? `/api/admin/rbac/roles/${roleId}` : null,
    fetcher,
    swrConfig
  )
  return {
    data: data?.role || null,
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Hook to fetch roles for a specific user
 * @param userId - The ID of the user
 * @returns { data: Role[], error, isLoading, isValidating, mutate }
 */
export function useUserRoles(userId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    userId ? `/api/admin/rbac/users/${userId}/roles` : null,
    fetcher,
    swrConfig
  )
  return {
    data: data?.roles || [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

// Mutation functions
type NotifierCallback = (message: { title: string; description: string; variant?: 'destructive' }) => void

/**
 * Create a new role
 * @param data - Role data to create
 * @param notifier - Optional callback for notifications
 */
export async function createRole(data: { name: string; display_name: string; description?: string; permissions?: string[] }, notifier?: NotifierCallback) {
  try {
    const response = await fetch('/api/admin/rbac/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create role')
    const result = await response.json()
    notifier?.({ title: 'Success', description: 'Role created successfully' })
    // Revalidate roles
    mutate('/api/admin/rbac/roles')
    return result
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to create role', variant: 'destructive' })
    throw error
  }
}

/**
 * Update an existing role
 * @param id - Role ID
 * @param data - Updated role data
 * @param notifier - Optional callback for notifications
 */
export async function updateRole(id: string, data: Partial<Role>, notifier?: NotifierCallback) {
  try {
    const response = await fetch(`/api/admin/rbac/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update role')
    const result = await response.json()
    notifier?.({ title: 'Success', description: 'Role updated successfully' })
    // Revalidate roles and role details
    mutate('/api/admin/rbac/roles')
    mutate(`/api/admin/rbac/roles/${id}`)
    return result
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to update role', variant: 'destructive' })
    throw error
  }
}

/**
 * Delete a role
 * @param id - Role ID
 * @param notifier - Optional callback for notifications
 */
export async function deleteRole(id: string, notifier?: NotifierCallback) {
  try {
    const response = await fetch(`/api/admin/rbac/roles/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete role')
    notifier?.({ title: 'Success', description: 'Role deleted successfully' })
    // Revalidate roles
    mutate('/api/admin/rbac/roles')
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' })
    throw error
  }
}

/**
 * Assign permissions to a role
 * @param roleId - Role ID
 * @param permissionIds - Array of permission IDs
 * @param notifier - Optional callback for notifications
 */
export async function assignPermissionsToRole(roleId: string, permissionIds: string[], notifier?: NotifierCallback) {
  try {
    const response = await fetch(`/api/admin/rbac/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: permissionIds }),
    })
    if (!response.ok) throw new Error('Failed to assign permissions')
    notifier?.({ title: 'Success', description: 'Permissions assigned successfully' })
    // Revalidate roles and role details
    mutate('/api/admin/rbac/roles')
    mutate(`/api/admin/rbac/roles/${roleId}`)
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to assign permissions', variant: 'destructive' })
    throw error
  }
}

/**
 * Assign roles to a user
 * @param userId - User ID
 * @param roleIds - Array of role IDs
 * @param notifier - Optional callback for notifications
 */
export async function assignRolesToUser(userId: string, roleIds: string[], notifier?: NotifierCallback) {
  try {
    const response = await fetch('/api/admin/rbac/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleIds }),
    })
    if (!response.ok) throw new Error('Failed to assign roles')
    notifier?.({ title: 'Success', description: 'Roles assigned successfully' })
    // Revalidate users and user roles
    mutate('/api/admin/rbac/users')
    mutate(`/api/admin/rbac/users/${userId}/roles`)
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to assign roles', variant: 'destructive' })
    throw error
  }
}

/**
 * Create a new permission
 * @param data - Permission data to create
 * @param notifier - Optional callback for notifications
 */
export async function createPermission(data: { name: string; display_name: string; description?: string; resource: string; action: string; module_id: string }, notifier?: NotifierCallback) {
  try {
    const response = await fetch('/api/admin/rbac/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create permission')
    const result = await response.json()
    notifier?.({ title: 'Success', description: 'Permission created successfully' })
    // Revalidate permissions
    mutate('/api/admin/rbac/permissions')
    return result
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to create permission', variant: 'destructive' })
    throw error
  }
}

/**
 * Delete a permission
 * @param id - Permission ID
 * @param notifier - Optional callback for notifications
 */
export async function deletePermission(id: string, notifier?: NotifierCallback) {
  try {
    const response = await fetch(`/api/admin/rbac/permissions/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete permission')
    notifier?.({ title: 'Success', description: 'Permission deleted successfully' })
    // Revalidate permissions
    mutate('/api/admin/rbac/permissions')
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to delete permission', variant: 'destructive' })
    throw error
  }
}

/**
 * Create a new module
 * @param data - Module data to create
 * @param notifier - Optional callback for notifications
 */
export async function createModule(data: { name: string; display_name: string; description?: string; icon: string; color: string; sort_order?: number }, notifier?: NotifierCallback) {
  try {
    const response = await fetch('/api/admin/rbac/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create module')
    const result = await response.json()
    notifier?.({ title: 'Success', description: 'Module created successfully' })
    // Revalidate modules
    mutate('/api/admin/rbac/modules')
    return result
  } catch (error) {
    notifier?.({ title: 'Error', description: 'Failed to create module', variant: 'destructive' })
    throw error
  }
}