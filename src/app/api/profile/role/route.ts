import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/profile/role
 * Get current user's role and permission information
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
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
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
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
        email: user.email,
        created_at: user.created_at
      },
      roles,
      permissions,
      total_permissions: permissions.length,
      total_roles: roles.length
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in GET /api/profile/role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
