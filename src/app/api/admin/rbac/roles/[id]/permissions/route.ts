import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/security/rls'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { auditService, extractRequestInfo } from '@/lib/services/auditService'
import { RouteContext } from '@/types/next-api'

/**
 * PUT /api/admin/rbac/roles/[id]/permissions
 * Update permissions for a specific role
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { id } = await context.params
    // Check permission
    const guardResult = await requirePermission('manage:rbac')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user, supabase } = guardResult

    const body = await request.json()
    const { permission_ids = [] } = body

    // Verify role exists
    const { data: role, error: roleError } = await supabase
      .from('rbac_roles')
      .select('id, name, display_name')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Remove all existing permissions for this role
    const { error: deleteError } = await supabase
      .from('rbac_role_permissions')
      .delete()
      .eq('role_id', id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing existing permissions:', deleteError)
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
    }

    // Add new permissions if any
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: id,
        permission_id: permissionId,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('rbac_role_permissions')
        .insert(rolePermissions)

      if (insertError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error assigning permissions:', insertError)
        return NextResponse.json({ error: 'Failed to assign permissions' }, { status: 500 })
      }
    }

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await auditService.logAction(
      user.id,
      'role_permissions_updated',
      'role',
      id,
      { 
        role_name: role.name, 
        permissions_count: permission_ids.length,
        permission_ids 
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({ 
      message: 'Permissions updated successfully',
      role_id: id,
      permissions_count: permission_ids.length
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in PUT /api/admin/rbac/roles/[id]/permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/rbac/roles/[id]/permissions
 * Get permissions for a specific role
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { id } = await context.params
    // Check permission
    const guardResult = await requirePermission('manage:rbac')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { supabase } = guardResult

    // Get role permissions
    const { data: rolePermissions, error: permissionsError } = await supabase
      .from('rbac_role_permissions')
      .select(`
        permission_id,
        rbac_permissions!inner(
          id,
          name,
          display_name,
          description,
          resource,
          action
        )
      `)
      .eq('role_id', id)
      .eq('is_active', true)

    if (permissionsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching role permissions:', permissionsError)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    const permissions = rolePermissions?.map(rp => rp.rbac_permissions) || []

    return NextResponse.json({ permissions })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in GET /api/admin/rbac/roles/[id]/permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
