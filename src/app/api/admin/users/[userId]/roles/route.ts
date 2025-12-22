/**
 * Admin User Roles API Route
 * GET /api/admin/users/[userId]/roles - Get user's roles
 * POST /api/admin/users/[userId]/roles - Assign role to user
 * DELETE /api/admin/users/[userId]/roles/[roleId] - Remove role from user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { logger } = context
  const { userId } = params

  const userRoles = await adminService.getUserRoles(userId)
  return NextResponse.json({ userRoles })
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user, logger } = context
  const { userId } = params

  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')

    const body = await request.json()
    const { role_ids, roleId, expiresAt } = body

    logger.info('Role assignment request', {
      userId,
      role_ids,
      roleId,
      bodyKeys: Object.keys(body),
      requesterIsSuperAdmin: isSuperAdmin
    })

    // Support both single roleId (legacy) and role_ids array (new)
    const roleIds = role_ids || (roleId ? [roleId] : [])

    if (!Array.isArray(roleIds)) {
      throw new ApiError('VALIDATION_ERROR', 'role_ids must be an array', 400)
    }

    // SECURITY: Prevent regular admins from assigning/removing super_admin role
    if (!isSuperAdmin && roleIds.length > 0) {
      // Check if any requested role is super_admin
      const { data: requestedRoles } = await supabase
        .from('admin_roles')
        .select('id, name')
        .in('id', roleIds)

      const hasSuperAdmin = requestedRoles?.some(r => r.name === 'super_admin')
      
      if (hasSuperAdmin) {
        throw new ApiError('FORBIDDEN', 'Only super_admin can assign super_admin role', 403)
      }
    }

    // Get current user roles
    const currentUserRoles = await adminService.getUserRoles(userId)
    interface UserRole {
      role_id?: string
      role?: { id: string }
    }
    const currentRoleIds = currentUserRoles.map((ur: UserRole) => ur.role_id || ur.role?.id).filter(Boolean) as string[]

    // SECURITY: Prevent regular admins from removing super_admin role
    if (!isSuperAdmin) {
      const { data: currentRoles } = await supabase
        .from('admin_user_roles')
        .select('role_id, admin_roles(name)')
        .eq('user_id', userId)
        .eq('is_active', true)

      interface RoleCheck {
        role_id: string
        admin_roles?: Array<{ name: string }> | { name: string }
      }
      const hasSuperAdminRole = currentRoles?.some((ur: RoleCheck) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        return role?.name === 'super_admin'
      })

      if (hasSuperAdminRole) {
        // Check if super_admin role is being removed
        const superAdminRoleId = currentRoles?.find((ur: RoleCheck) => {
          const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
          return role?.name === 'super_admin'
        })?.role_id

        if (superAdminRoleId && !roleIds.includes(superAdminRoleId)) {
          throw new ApiError('FORBIDDEN', 'Only super_admin can remove super_admin role', 403)
        }
      }
    }

    // SECURITY: Prevent users from assigning roles to themselves (except super_admin)
    if (userId === user.id && !isSuperAdmin) {
      throw new ApiError('FORBIDDEN', 'You cannot modify your own roles', 403)
    }

    logger.info('Current user roles', {
      userId,
      currentRoleIds,
      requestedRoleIds: roleIds,
      currentUserRolesStructure: currentUserRoles.map((ur: UserRole) => ({
        role_id: ur.role_id,
        hasRole: !!ur.role,
        roleId: ur.role?.id
      }))
    })

    // Determine roles to add and remove
    const rolesToAdd = roleIds.filter(id => !currentRoleIds.includes(id))
    const rolesToRemove = currentRoleIds.filter(id => !roleIds.includes(id))

    logger.info('Role changes', {
      rolesToAdd,
      rolesToRemove,
      comparison: {
        requested: roleIds,
        current: currentRoleIds,
        requestedTypes: roleIds.map(id => typeof id),
        currentTypes: currentRoleIds.map(id => typeof id)
      }
    })

    // Remove roles that are no longer assigned
    const removeResults = []
    for (const roleId of rolesToRemove) {
      try {
        const removed = await adminService.removeRoleFromUser(userId, roleId)
        removeResults.push({ roleId, success: removed })
        logger.info(`Removed role ${roleId}`, { removed })
        if (!removed) {
          logger.error(`Failed to remove role ${roleId}`)
        }
      } catch (error) {
        logger.error(`Error removing role ${roleId}`, { error })
        removeResults.push({ roleId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Add new roles
    const addResults = []
    for (const roleId of rolesToAdd) {
      try {
        const added = await adminService.assignRoleToUser(
          userId,
          roleId,
          user.id,
          expiresAt
        )
        addResults.push({ roleId, success: added })
        logger.info(`Added role ${roleId}`, { added })
        if (!added) {
          logger.error(`Failed to add role ${roleId}`)
        }
      } catch (error) {
        logger.error(`Error adding role ${roleId}`, { error })
        addResults.push({ roleId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Check if any operations failed
    const failedAdds = addResults.filter(r => !r.success)
    const failedRemoves = removeResults.filter(r => !r.success)

    if (failedAdds.length > 0 || failedRemoves.length > 0) {
      logger.error('Some role operations failed', {
        failedAdds,
        failedRemoves
      })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Some role operations failed', 500)
    }

    return NextResponse.json({ 
      success: true,
      added: rolesToAdd.length,
      removed: rolesToRemove.length
    })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/[userId]/roles' 
})

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/[userId]/roles' 
})

