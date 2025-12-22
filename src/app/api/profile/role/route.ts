import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext, createGetHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

/**
 * GET /api/profile/role
 * Get current user's role and permission information
 */
async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    // Get user's roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('rbac_user_roles')
      .select(`
        id,
        assigned_at,
        assigned_by,
        rbac_roles(
          id,
          name,
          display_name,
          description,
          is_system,
          sort_order
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('rbac_roles(sort_order)')

    if (rolesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles:', rolesError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch roles', 500)
    }

    // Get user's permissions
    const { data: userPermissions, error: permissionsError } = await supabase
      .from('rbac_user_roles')
      .select(`
        rbac_roles(
          rbac_role_permissions(
            rbac_permissions(
              id,
              name,
              display_name,
              description,
              resource,
              action,
              is_system
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (permissionsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user permissions:', permissionsError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch permissions', 500)
    }

    // Transform the data
    const roles = userRoles?.map(ur => {
      const role = Array.isArray(ur.rbac_roles) ? ur.rbac_roles[0] : ur.rbac_roles
      return {
        id: role?.id,
        name: role?.name,
        display_name: role?.display_name,
        description: role?.description,
        is_system: role?.is_system,
        sort_order: role?.sort_order,
        assigned_at: ur.assigned_at,
        assigned_by: ur.assigned_by
      }
    }).filter(role => role.id) || []

    const permissions = userPermissions
      ?.flatMap(ur => {
        const role = Array.isArray(ur.rbac_roles) ? ur.rbac_roles[0] : ur.rbac_roles
        return role?.rbac_role_permissions || []
      })
      .map(rp => {
        const perm = Array.isArray(rp.rbac_permissions) ? rp.rbac_permissions[0] : rp.rbac_permissions
        return perm
      })
      .filter(Boolean) || []

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      roles,
      permissions,
      total_permissions: permissions.length,
      total_roles: roles.length
    })
}

export const GET = createGetHandler(handler, { requireAuth: true, loggerContext: 'api/profile/role' })
