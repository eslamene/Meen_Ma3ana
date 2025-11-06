import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

interface RbacPermission {
  name: string
}

interface RbacRolePermission {
  rbac_permissions?: RbacPermission | null | RbacPermission[]
}

interface RbacRole {
  rbac_role_permissions?: RbacRolePermission | null | RbacRolePermission[]
}

interface RbacModule {
  id: string
  name: string
  display_name: string | null
  icon: string | null
  color: string | null
}

interface PermissionWithModule {
  [key: string]: unknown
  rbac_modules?: RbacModule | null | RbacModule[]
}

interface UserRoleWithPermissions {
  rbac_roles?: {
    rbac_role_permissions?: Array<{
      rbac_permissions?: {
        name: string
      } | null
    }> | null
  } | null
}

interface GroupedPermissionsAccumulator {
  [moduleName: string]: {
    module: RbacModule | null
    permissions: Array<PermissionWithModule>
  }
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has RBAC management permission
    const { data: userRoles } = await serviceClient
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          rbac_role_permissions (
            rbac_permissions (name)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasPermission = (userRoles as UserRoleWithPermissions[] | null)?.some((ur) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'grouped') {
      // Get permissions grouped by module
      const { data: permissions, error: permissionsError } = await serviceClient
        .from('rbac_permissions')
        .select(`
          *,
          rbac_modules (
            id,
            name,
            display_name,
            icon,
            color
          )
        `)
        .eq('is_active', true)
        .order('name')

      if (permissionsError) throw permissionsError

      // Group permissions by module
      const groupedPermissions = (permissions as Array<PermissionWithModule>).reduce((acc: GroupedPermissionsAccumulator, permission) => {
        const moduleName = (permission.rbac_modules as RbacModule | null)?.name || 'uncategorized'
        if (!acc[moduleName]) {
          acc[moduleName] = {
            module: permission.rbac_modules as RbacModule | null,
            permissions: []
          }
        }
        acc[moduleName].permissions.push(permission)
        return acc
      }, {} as GroupedPermissionsAccumulator)

      return NextResponse.json({ groupedPermissions })
    } else {
      // Get all modules
      const { data: modules, error: modulesError } = await serviceClient
        .from('rbac_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (modulesError) throw modulesError

      return NextResponse.json({ modules })
    }
  } catch (error: unknown) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Permission Modules API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Use service client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has RBAC management permission
    const { data: userRoles } = await serviceClient
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          rbac_role_permissions (
            rbac_permissions (name)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasPermission = (userRoles as UserRoleWithPermissions[] | null)?.some((ur) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: module, error: createError } = await serviceClient
      .from('rbac_modules')
      .insert({
        name: body.name,
        display_name: body.display_name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        sort_order: body.sort_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({ module })
  } catch (error: unknown) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Create Module API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Module ID required' }, { status: 400 })
    }

    // Use service client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has RBAC management permission
    const { data: userRoles } = await serviceClient
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          rbac_role_permissions (
            rbac_permissions (name)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasPermission = (userRoles as UserRoleWithPermissions[] | null)?.some((ur) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: module, error: updateError } = await serviceClient
      .from('rbac_modules')
      .update({
        display_name: body.display_name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        sort_order: body.sort_order
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ module })
  } catch (error: unknown) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Update Module API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Module ID required' }, { status: 400 })
    }

    // Use service client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has RBAC management permission
    const { data: userRoles } = await serviceClient
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          rbac_role_permissions (
            rbac_permissions (name)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const hasPermission = (userRoles as UserRoleWithPermissions[] | null)?.some((ur) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await serviceClient
      .from('rbac_modules')
      .update({ is_active: false })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Delete Module API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}