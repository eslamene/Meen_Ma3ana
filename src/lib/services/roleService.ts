/**
 * Role Service — admin roles and role–permission links.
 * Server-side only; accepts Supabase client as parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface AdminRoleRow {
  id: string
  name: string
  display_name: string | null
  display_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  level: number | null
  is_system: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string | null
  admin_role_permissions?: Array<{
    permission_id: string
    admin_permissions?: unknown[] | unknown
  }>
}

export interface RoleWithCounts extends Record<string, unknown> {
  id: string
  name: string
  permissions: unknown[]
  permissions_count: number
  users_count: number
}

export class RoleService {
  static async listActiveWithPermissionsAndUserCounts(
    supabase: SupabaseClient
  ): Promise<RoleWithCounts[]> {
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select(
        `
        *,
        admin_role_permissions(
          permission_id,
          admin_permissions(*)
        )
      `
      )
      .eq('is_active', true)
      .order('level', { ascending: true })

    if (rolesError) {
      defaultLogger.error('Error fetching roles:', rolesError)
      throw new Error(`Failed to fetch roles: ${rolesError.message}`)
    }

    const { data: userRoles, error: userRolesError } = await supabase
      .from('admin_user_roles')
      .select('role_id, user_id')
      .eq('is_active', true)

    if (userRolesError) {
      defaultLogger.error('Error fetching user roles for counts:', userRolesError)
    }

    const usersCountByRole = new Map<string, number>()
    if (userRoles) {
      interface UserRole {
        role_id: string
        user_id: string
      }
      userRoles.forEach((ur: UserRole) => {
        const count = usersCountByRole.get(ur.role_id) || 0
        usersCountByRole.set(ur.role_id, count + 1)
      })
    }

    return (roles || []).map((role: AdminRoleRow) => {
      const permissions = (role.admin_role_permissions || [])
        .map((rp) => {
          const perm = Array.isArray(rp.admin_permissions)
            ? rp.admin_permissions[0]
            : rp.admin_permissions
          return perm
        })
        .filter(Boolean)

      return {
        ...role,
        permissions,
        permissions_count: permissions.length,
        users_count: usersCountByRole.get(role.id) || 0
      } as RoleWithCounts
    })
  }

  static async create(
    supabase: SupabaseClient,
    data: {
      name: string
      display_name: string
      display_name_ar?: string | null
      description?: string | null
      description_ar?: string | null
      level?: number
    }
  ): Promise<AdminRoleRow> {
    const { data: row, error } = await supabase
      .from('admin_roles')
      .insert({
        name: data.name,
        display_name: data.display_name,
        display_name_ar: data.display_name_ar,
        description: data.description,
        description_ar: data.description_ar,
        level: data.level ?? 0,
        is_system: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating role:', error)
      throw new Error(`Failed to create role: ${error.message}`)
    }

    return row as AdminRoleRow
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<Pick<AdminRoleRow, 'is_system' | 'name'> | null> {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('is_system, name')
      .eq('id', id)
      .single()

    if (error) {
      defaultLogger.error('Error fetching role:', error)
      throw new Error(`Failed to fetch role: ${error.message}`)
    }

    return data as Pick<AdminRoleRow, 'is_system' | 'name'> | null
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: {
      display_name?: string
      display_name_ar?: string | null
      description?: string | null
      description_ar?: string | null
      level?: number
    }
  ): Promise<AdminRoleRow> {
    const { data: row, error } = await supabase
      .from('admin_roles')
      .update({
        display_name: data.display_name,
        display_name_ar: data.display_name_ar,
        description: data.description,
        description_ar: data.description_ar,
        level: data.level !== undefined ? data.level : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating role:', error)
      throw new Error(`Failed to update role: ${error.message}`)
    }

    return row as AdminRoleRow
  }

  static async getRoleWithPermissionsForApi(
    supabase: SupabaseClient,
    id: string
  ): Promise<{
    role: { id: string; name: string; display_name: string | null }
    permissions: unknown[]
  }> {
    const { data: roleData, error } = await supabase
      .from('admin_roles')
      .select(
        `
        id,
        name,
        display_name,
        admin_role_permissions(
          permission_id,
          admin_permissions(*)
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      defaultLogger.error('Error fetching role with permissions:', error)
      throw new Error(`Failed to fetch role: ${error.message}`)
    }

    interface RolePermission {
      permission_id: string
      admin_permissions?: unknown
    }
    const permissions = (roleData.admin_role_permissions || [])
      .map((rp: RolePermission) => rp.admin_permissions)
      .filter(Boolean)

    return {
      role: {
        id: roleData.id,
        name: roleData.name,
        display_name: roleData.display_name
      },
      permissions
    }
  }

  static async replaceRolePermissions(
    supabase: SupabaseClient,
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase.from('admin_role_permissions').delete().eq('role_id', roleId)

    if (deleteError) {
      defaultLogger.error('Error deleting role permissions:', deleteError)
      throw new Error(`Failed to clear role permissions: ${deleteError.message}`)
    }

    if (permissionIds.length === 0) return

    const rolePermissions = permissionIds.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId
    }))

    const { error: insertError } = await supabase.from('admin_role_permissions').insert(rolePermissions)

    if (insertError) {
      defaultLogger.error('Error inserting role permissions:', insertError)
      throw new Error(`Failed to set role permissions: ${insertError.message}`)
    }
  }
}
