/**
 * Legacy `roles` / `role_permissions` tables (distinct from admin_roles).
 * Used by admin role-permissions UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export class LegacyRolePermissionService {
  static async getRoleWithPermissions(
    adminClient: SupabaseClient,
    roleId: string
  ): Promise<Record<string, unknown>> {
    const { data: role, error: roleError } = await adminClient
      .from('roles')
      .select(
        `
        *,
        role_permissions(
          permissions(*)
        )
      `
      )
      .eq('id', roleId)
      .single()

    if (roleError) {
      defaultLogger.error('Error fetching legacy role:', roleError)
      throw new Error(`Failed to fetch role: ${roleError.message}`)
    }

    return role as Record<string, unknown>
  }

  static async replaceRolePermissions(
    adminClient: SupabaseClient,
    roleId: string,
    permissionIds: string[] | undefined
  ): Promise<void> {
    const { error: deleteError } = await adminClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (deleteError) {
      defaultLogger.error('Error removing role_permissions:', deleteError)
      throw new Error(`Failed to remove permissions: ${deleteError.message}`)
    }

    if (permissionIds && permissionIds.length > 0) {
      const rows = permissionIds.map((permissionId: string) => ({
        role_id: roleId,
        permission_id: permissionId,
      }))

      const { error: insertError } = await adminClient.from('role_permissions').insert(rows)

      if (insertError) {
        defaultLogger.error('Error inserting role_permissions:', insertError)
        throw new Error(`Failed to insert permissions: ${insertError.message}`)
      }
    }
  }
}
