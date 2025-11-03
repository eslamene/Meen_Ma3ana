import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { requirePermission } from '@/lib/security/rls'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/admin/rbac/permissions
 * Get all permissions grouped by module
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Use permission guard
    const guardResult = await requirePermission('manage:rbac')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user, supabase } = guardResult

    // Get all permissions with their modules
    const { data: permissions, error: permissionsError } = await supabase
      .from('rbac_permissions')
      .select(`
        *,
        rbac_modules(
          id,
          name,
          display_name,
          icon,
          color
        )
      `)
      .eq('is_active', true)
      .order('resource', { ascending: true })

    if (permissionsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching permissions:', permissionsError)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    // Group permissions by module
    const permissionsByModule = permissions?.reduce((acc, permission) => {
      const moduleName = permission.rbac_modules?.name || 'other'
      if (!acc[moduleName]) {
        acc[moduleName] = {
          module: permission.rbac_modules,
          permissions: []
        }
      }
      acc[moduleName].permissions.push({
        id: permission.id,
        name: permission.name,
        display_name: permission.display_name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        is_system: permission.is_system
      })
      return acc
    }, {} as Record<string, unknown>) || {}

    return NextResponse.json({ permissionsByModule })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in GET /api/admin/rbac/permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/rbac/permissions
 * Create a new permission
 */
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Use permission guard
    const guardResult = await requirePermission('manage:rbac')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user, supabase } = guardResult

    const body = await request.json()
    const { 
      name, 
      display_name, 
      description, 
      resource, 
      action, 
      module_id 
    } = body

    // Validate required fields
    if (!name || !display_name || !resource || !action || !module_id) {
      return NextResponse.json({ 
        error: 'name, display_name, resource, action, and module_id are required' 
      }, { status: 400 })
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from('rbac_permissions')
      .select('id')
      .eq('name', name)
      .eq('is_active', true)
      .single()

    if (existingPermission) {
      return NextResponse.json({ error: 'Permission with this name already exists' }, { status: 409 })
    }

    // Validate module exists
    const { data: module } = await supabase
      .from('rbac_modules')
      .select('id')
      .eq('id', module_id)
      .eq('is_active', true)
      .single()

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Create the permission
    const { data: newPermission, error: permissionError } = await supabase
      .from('rbac_permissions')
      .insert({
        name,
        display_name,
        description,
        resource,
        action,
        module_id,
        is_system: false
      })
      .select()
      .single()

    if (permissionError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating permission:', permissionError)
      return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 })
    }

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAction(
      user.id,
      'permission_created',
      'permission',
      newPermission.id,
      { 
        permission_name: name,
        resource,
        action
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({ 
      message: 'Permission created successfully',
      permission: newPermission 
    }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in POST /api/admin/rbac/permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
