import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditService, extractRequestInfo } from '@/lib/services/auditService'
import { requirePermission } from '@/lib/security/guards'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/admin/rbac/modules
 * Get all permission modules
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

    // Get all modules with their permissions count
    const { data: modules, error: modulesError } = await supabase
      .from('rbac_modules')
      .select(`
        *,
        rbac_permissions!inner(count)
      `)
      .eq('is_active', true)
      .order('sort_order')

    if (modulesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching modules:', modulesError)
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    // Transform the data
    const transformedModules = modules?.map((module: any) => ({
      id: module.id,
      name: module.name,
      display_name: module.display_name,
      description: module.description,
      icon: module.icon,
      color: module.color,
      sort_order: module.sort_order,
      is_system: module.is_system,
      permissions_count: module.rbac_permissions?.[0]?.count || 0
    })) || []

    return NextResponse.json({ modules: transformedModules })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in GET /api/admin/rbac/modules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/rbac/modules
 * Create a new permission module
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
      icon, 
      color, 
      sort_order 
    } = body

    // Validate required fields
    if (!name || !display_name) {
      return NextResponse.json({ 
        error: 'name and display_name are required' 
      }, { status: 400 })
    }

    // Check if module already exists
    const { data: existingModule } = await supabase
      .from('rbac_modules')
      .select('id')
      .eq('name', name)
      .eq('is_active', true)
      .single()

    if (existingModule) {
      return NextResponse.json({ error: 'Module with this name already exists' }, { status: 409 })
    }

    // Get the next sort order if not provided
    let finalSortOrder = sort_order
    if (!finalSortOrder) {
      const { data: lastModule } = await supabase
        .from('rbac_modules')
        .select('sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      finalSortOrder = (lastModule?.sort_order || 0) + 1
    }

    // Create the module
    const { data: newModule, error: moduleError } = await supabase
      .from('rbac_modules')
      .insert({
        name,
        display_name,
        description,
        icon: icon || 'Circle',
        color: color || '#6B7280',
        sort_order: finalSortOrder,
        is_system: false
      })
      .select()
      .single()

    if (moduleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating module:', moduleError)
      return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
    }

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await auditService.logAction(
      user.id,
      'module_created',
      'module',
      newModule.id,
      { 
        module_name: name,
        display_name
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({ 
      message: 'Module created successfully',
      module: newModule 
    }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in POST /api/admin/rbac/modules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
