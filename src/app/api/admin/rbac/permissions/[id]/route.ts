import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditService } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * PUT /api/admin/rbac/permissions/[id]
 * Update a permission
 */
export async function PUT(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (roleError) {
      return NextResponse.json({ error: 'Failed to check user permissions' }, { status: 500 })
    }

    const hasAdminRole = userRoles?.some((ur: any) => 
      ur.rbac_roles?.name === 'admin' || ur.rbac_roles?.name === 'super_admin'
    )

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { name, display_name, description, resource, action, module_id } = body

    if (!id) {
      return NextResponse.json({ error: 'Permission ID is required' }, { status: 400 })
    }

    // Check if permission exists and is not a system permission
    const { data: existingPermission, error: fetchError } = await supabase
      .from('rbac_permissions')
      .select('is_system, name')
      .eq('id', id)
      .single()

    if (fetchError || !existingPermission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    if (existingPermission.is_system) {
      return NextResponse.json({ error: 'Cannot modify system permissions' }, { status: 400 })
    }

    // Update the permission
    const { error: updateError } = await supabase
      .from('rbac_permissions')
      .update({
        name,
        display_name,
        description,
        resource,
        action,
        module_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating permission:', updateError)
      return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 })
    }

    // Log the action
    await auditService.logAction({
      userId: user.id,
      action: 'permission_updated',
      resourceType: 'permission',
      resourceId: id,
      details: { 
        old_name: existingPermission.name,
        new_name: name,
        display_name,
        resource,
        action 
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Permission updated successfully' 
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating permission:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/rbac/permissions/[id]
 * Delete a permission
 */
export async function DELETE(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (roleError) {
      return NextResponse.json({ error: 'Failed to check user permissions' }, { status: 500 })
    }

    const hasAdminRole = userRoles?.some((ur: any) => 
      ur.rbac_roles?.name === 'admin' || ur.rbac_roles?.name === 'super_admin'
    )

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Permission ID is required' }, { status: 400 })
    }

    // Delete the permission
    const { error: deleteError } = await supabase
      .from('rbac_permissions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permission deleted successfully' 
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting permission:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
