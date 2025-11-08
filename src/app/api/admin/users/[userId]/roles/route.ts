/**
 * Admin User Roles API Route
 * GET /api/admin/users/[userId]/roles - Get user's roles
 * POST /api/admin/users/[userId]/roles - Assign role to user
 * DELETE /api/admin/users/[userId]/roles/[roleId] - Remove role from user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const hasAdminRole = await adminService.hasRole(user.id, 'admin') || 
                         await adminService.hasRole(user.id, 'super_admin')

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userRoles = await adminService.getUserRoles(params.userId)
    return NextResponse.json({ userRoles })
  } catch (error) {
    defaultLogger.error('Error fetching user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const hasAdminRole = await adminService.hasRole(user.id, 'admin') || 
                         await adminService.hasRole(user.id, 'super_admin')
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { role_ids, roleId, expiresAt } = body

    defaultLogger.info('Role assignment request:', {
      userId: params.userId,
      role_ids,
      roleId,
      bodyKeys: Object.keys(body),
      requesterIsSuperAdmin: isSuperAdmin
    })

    // Support both single roleId (legacy) and role_ids array (new)
    const roleIds = role_ids || (roleId ? [roleId] : [])

    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: 'role_ids must be an array' },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: 'Only super_admin can assign super_admin role' },
          { status: 403 }
        )
      }
    }

    // Get current user roles
    const currentUserRoles = await adminService.getUserRoles(params.userId)
    const currentRoleIds = currentUserRoles.map(ur => ur.role_id || (ur as any).role?.id).filter(Boolean)

    // SECURITY: Prevent regular admins from removing super_admin role
    if (!isSuperAdmin) {
      const { data: currentRoles } = await supabase
        .from('admin_user_roles')
        .select('role_id, admin_roles(name)')
        .eq('user_id', params.userId)
        .eq('is_active', true)

      const hasSuperAdminRole = currentRoles?.some((ur: any) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        return role?.name === 'super_admin'
      })

      if (hasSuperAdminRole) {
        // Check if super_admin role is being removed
        const superAdminRoleId = currentRoles?.find((ur: any) => {
          const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
          return role?.name === 'super_admin'
        })?.role_id

        if (superAdminRoleId && !roleIds.includes(superAdminRoleId)) {
          return NextResponse.json(
            { error: 'Only super_admin can remove super_admin role' },
            { status: 403 }
          )
        }
      }
    }

    // SECURITY: Prevent users from assigning roles to themselves (except super_admin)
    if (params.userId === user.id && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'You cannot modify your own roles' },
        { status: 403 }
      )
    }

    defaultLogger.info('Current user roles:', {
      userId: params.userId,
      currentRoleIds,
      requestedRoleIds: roleIds,
      currentUserRolesStructure: currentUserRoles.map(ur => ({
        role_id: ur.role_id,
        hasRole: !!ur.role,
        roleId: (ur as any).role?.id
      }))
    })

    // Determine roles to add and remove
    const rolesToAdd = roleIds.filter(id => !currentRoleIds.includes(id))
    const rolesToRemove = currentRoleIds.filter(id => !roleIds.includes(id))

    defaultLogger.info('Role changes:', {
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
        const removed = await adminService.removeRoleFromUser(params.userId, roleId)
        removeResults.push({ roleId, success: removed })
        defaultLogger.info(`Removed role ${roleId}:`, removed)
        if (!removed) {
          defaultLogger.error(`Failed to remove role ${roleId}`)
        }
      } catch (error) {
        defaultLogger.error(`Error removing role ${roleId}:`, error)
        removeResults.push({ roleId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Add new roles
    const addResults = []
    for (const roleId of rolesToAdd) {
      try {
        const added = await adminService.assignRoleToUser(
          params.userId,
          roleId,
          user.id,
          expiresAt
        )
        addResults.push({ roleId, success: added })
        defaultLogger.info(`Added role ${roleId}:`, added)
        if (!added) {
          defaultLogger.error(`Failed to add role ${roleId}`)
        }
      } catch (error) {
        defaultLogger.error(`Error adding role ${roleId}:`, error)
        addResults.push({ roleId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Check if any operations failed
    const failedAdds = addResults.filter(r => !r.success)
    const failedRemoves = removeResults.filter(r => !r.success)

    if (failedAdds.length > 0 || failedRemoves.length > 0) {
      defaultLogger.error('Some role operations failed:', {
        failedAdds,
        failedRemoves
      })
      return NextResponse.json({
        success: false,
        error: 'Some role operations failed',
        added: addResults.filter(r => r.success).length,
        removed: removeResults.filter(r => r.success).length,
        failed: {
          adds: failedAdds,
          removes: failedRemoves
        }
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      added: rolesToAdd.length,
      removed: rolesToRemove.length
    })
  } catch (error) {
    defaultLogger.error('Error assigning roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

