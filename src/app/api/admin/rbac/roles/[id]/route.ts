import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditService } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/admin/rbac/roles/[id]
 * Get a specific role with its permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('rbac_user_roles')
      .select('rbac_roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasAdminRole = userRoles?.some(ur => ur.rbac_roles?.name === 'admin')
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 })
    }

    const { data: role, error: roleError } = await supabase
      .from('rbac_roles')
      .select(`
        *,
        rbac_role_permissions(
          rbac_permissions(*)
        )
      `)
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (roleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching role:', roleError)
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Transform the data
    const transformedRole = {
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      is_system: role.is_system,
      sort_order: role.sort_order,
      permissions: role.rbac_role_permissions?.map(rp => rp.rbac_permissions) || []
    }

    return NextResponse.json({ role: transformedRole })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in GET /api/admin/rbac/roles/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/rbac/roles/[id]
 * Update a role and its permissions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('rbac_user_roles')
      .select('rbac_roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasAdminRole = userRoles?.some(ur => ur.rbac_roles?.name === 'admin')
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, description, permissions = [] } = body

    // Check if role exists and is not a system role
    const { data: existingRole } = await supabase
      .from('rbac_roles')
      .select('is_system')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (existingRole.is_system) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 400 })
    }

    // Update the role
    const { error: roleError } = await supabase
      .from('rbac_roles')
      .update({
        display_name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (roleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating role:', roleError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // Update permissions
    // First, remove all existing permissions
    const { error: deleteError } = await supabase
      .from('rbac_role_permissions')
      .delete()
      .eq('role_id', params.id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing old permissions:', deleteError)
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
    }

    // Then, add new permissions
    if (permissions.length > 0) {
      const rolePermissions = permissions.map((permissionId: string) => ({
        role_id: params.id,
        permission_id: permissionId
      }))

      const { error: permissionsError } = await supabase
        .from('rbac_role_permissions')
        .insert(rolePermissions)

      if (permissionsError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error assigning new permissions:', permissionsError)
        return NextResponse.json({ error: 'Failed to assign permissions' }, { status: 500 })
      }
    }

    // Log the action
    await auditService.logAction({
      userId: user.id,
      action: 'role_updated',
      resourceType: 'role',
      resourceId: params.id,
      details: { permissions_count: permissions.length }
    })

    return NextResponse.json({ message: 'Role updated successfully' })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in PUT /api/admin/rbac/roles/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/rbac/roles/[id]
 * Delete a role (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('rbac_user_roles')
      .select('rbac_roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasAdminRole = userRoles?.some(ur => ur.rbac_roles?.name === 'admin')
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 })
    }

    // Check if role exists and is not a system role
    const { data: existingRole } = await supabase
      .from('rbac_roles')
      .select('is_system')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (existingRole.is_system) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })
    }

    // Check if role is assigned to any users
    const { data: userAssignments } = await supabase
      .from('rbac_user_roles')
      .select('id')
      .eq('role_id', params.id)
      .eq('is_active', true)
      .limit(1)

    if (userAssignments && userAssignments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users. Remove all user assignments first.' 
      }, { status: 400 })
    }

    // Soft delete the role
    const { error: deleteError } = await supabase
      .from('rbac_roles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting role:', deleteError)
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
    }

    // Log the action
    await auditService.logAction({
      userId: user.id,
      action: 'role_deleted',
      resourceType: 'role',
      resourceId: params.id,
      details: {}
    })

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in DELETE /api/admin/rbac/roles/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
