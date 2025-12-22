/**
 * Clean Administration API Routes
 * API endpoints for managing roles, permissions, and user access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    // Fetch roles with permissions (left join to include roles without permissions)
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        *,
        admin_role_permissions(
          permission_id,
          admin_permissions(*)
        )
      `)
      .eq('is_active', true)
      .order('level', { ascending: true })

    if (rolesError) {
      logger.error('Error fetching roles:', rolesError)
      throw rolesError
    }

    // Fetch user counts separately (using a different approach to avoid RLS issues)
    const { data: userRoles, error: userRolesError } = await supabase
      .from('admin_user_roles')
      .select('role_id, user_id')
      .eq('is_active', true)

    if (userRolesError) {
      logger.error('Error fetching user roles for counts:', userRolesError)
    }

    // Count users per role
    interface UserRole {
      role_id: string
      user_id: string
    }
    const usersCountByRole = new Map<string, number>()
    if (userRoles) {
      userRoles.forEach((ur: UserRole) => {
        const count = usersCountByRole.get(ur.role_id) || 0
        usersCountByRole.set(ur.role_id, count + 1)
      })
    }

    // Map roles with counts
    interface RoleWithPermissions {
      id: string
      name: string
      display_name: string | null
      level: number | null
      admin_role_permissions?: Array<{
        permission_id: string
        admin_permissions?: Array<unknown> | unknown
      }>
    }
    const rolesWithCounts = (roles || []).map((role: RoleWithPermissions) => {
      // Extract permissions from nested structure
      const permissions = (role.admin_role_permissions || [])
        .map((rp) => {
          // Handle both array and object formats
          const perm = Array.isArray(rp.admin_permissions) 
            ? rp.admin_permissions[0] 
            : rp.admin_permissions
          return perm
        })
        .filter(Boolean)
      
      return {
        ...role,
        permissions: permissions,
        permissions_count: permissions.length,
        users_count: usersCountByRole.get(role.id) || 0
      }
    })

    logger.info('Roles fetched with counts:', {
      totalRoles: rolesWithCounts.length,
      rolesWithPermissions: rolesWithCounts.filter(r => r.permissions_count > 0).length,
      rolesWithUsers: rolesWithCounts.filter(r => r.users_count > 0).length
    })

    return NextResponse.json({ roles: rolesWithCounts })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { name, display_name, display_name_ar, description, description_ar, level } = body

  if (!name || !display_name) {
    throw new ApiError('VALIDATION_ERROR', 'Name and display_name are required', 400)
  }

  const { data, error } = await supabase
    .from('admin_roles')
    .insert({
      name,
      display_name,
      display_name_ar,
      description,
      description_ar,
      level: level || 0,
      is_system: false,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ role: data })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles' })
export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles' })

