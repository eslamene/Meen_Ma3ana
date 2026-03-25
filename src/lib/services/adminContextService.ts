/**
 * Server-side admin bootstrap for the current session (cookie-based Supabase client).
 * Used by GET /api/admin/context — keeps `useAdmin` off direct client `.from()` / RPC.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import type { AdminMenuItem, AdminPermission, AdminRole } from '@/lib/admin/types'

export interface AdminContextPayload {
  user: { id: string; email?: string } | null
  roles: AdminRole[]
  permissions: AdminPermission[]
  /** Flat rows; client builds tree via `buildMenuTree`. */
  menuItems: AdminMenuItem[]
}

export async function getAdminContextForSession(supabase: SupabaseClient): Promise<AdminContextPayload> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    const { data: publicMenu } = await supabase
      .from('admin_menu_items')
      .select('*')
      .eq('is_active', true)
      .is('permission_id', null)
      .order('sort_order')

    return {
      user: null,
      roles: [],
      permissions: [],
      menuItems: (publicMenu || []) as AdminMenuItem[],
    }
  }

  const [rolesRes, permissionsRes, menuRes] = await Promise.all([
    supabase
      .from('admin_user_roles')
      .select(
        `
            admin_roles (*)
          `
      )
      .eq('user_id', authUser.id)
      .eq('is_active', true),
    supabase.rpc('get_user_permission_names', { user_id: authUser.id }),
    supabase.rpc('get_user_menu_items', { user_id: authUser.id }),
  ])

  const userRoles = (rolesRes.data || [])
    .map((ur: { admin_roles?: AdminRole | AdminRole[] }) => {
      const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
      return role
    })
    .filter(Boolean) as AdminRole[]

  userRoles.sort((a, b) => (b.level || 0) - (a.level || 0))

  let userPermissions: AdminPermission[] = []
  if (permissionsRes.error) {
    const errorMessage = permissionsRes.error.message || 'Unknown error'
    defaultLogger.error(
      `Error fetching permissions (RPC may not exist): ${errorMessage}`,
      new Error(errorMessage)
    )

    const { data: fallbackPermissions } = await supabase
      .from('admin_user_roles')
      .select(
        `
            admin_roles!inner(
              admin_role_permissions(
                admin_permissions(*)
              )
            )
          `
      )
      .eq('user_id', authUser.id)
      .eq('is_active', true)

    const allPermissions: AdminPermission[] = []
    if (fallbackPermissions) {
      type PermCell = { admin_permissions?: AdminPermission | AdminPermission[] }
      type RoleCell = { admin_role_permissions?: PermCell[] }
      const rows = fallbackPermissions as Array<{ admin_roles?: RoleCell | RoleCell[] }>
      rows.forEach((ur) => {
        const wrapped = ur.admin_roles
        const roleCells: RoleCell[] = Array.isArray(wrapped) ? wrapped : wrapped ? [wrapped] : []
        for (const role of roleCells) {
          for (const rp of role.admin_role_permissions || []) {
            const p = rp.admin_permissions
            const perm = Array.isArray(p) ? p[0] : p
            if (perm?.is_active) allPermissions.push(perm)
          }
        }
      })
    }
    userPermissions = [...new Map(allPermissions.map((p) => [p.id, p])).values()]
  } else if (permissionsRes.data && permissionsRes.data.length > 0) {
    const { data: permissionDetails } = await supabase
      .from('admin_permissions')
      .select('*')
      .in('name', permissionsRes.data as string[])
      .eq('is_active', true)

    userPermissions = permissionDetails || []
  }

  let menuItems: AdminMenuItem[] = []
  if (menuRes.error) {
    const errorMessage = menuRes.error.message || 'Unknown error'
    defaultLogger.error(
      `Error fetching menu items (RPC may not exist): ${errorMessage}`,
      new Error(errorMessage)
    )

    const { data: fallbackMenu } = await supabase
      .from('admin_menu_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    menuItems = (fallbackMenu || []).filter((item: AdminMenuItem) => {
      if (!item.permission_id) return true
      return userPermissions.some((p) => p.id === item.permission_id)
    }) as AdminMenuItem[]
  } else {
    menuItems = (menuRes.data || []) as AdminMenuItem[]
  }

  return {
    user: { id: authUser.id, email: authUser.email ?? undefined },
    roles: userRoles,
    permissions: userPermissions,
    menuItems,
  }
}
