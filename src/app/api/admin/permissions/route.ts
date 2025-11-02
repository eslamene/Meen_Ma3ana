import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

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

    const hasPermission = userRoles?.some((ur: any) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp: any) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: permissions, error: permissionsError } = await serviceClient
      .from('rbac_permissions')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (permissionsError) throw permissionsError

    return NextResponse.json({ permissions })
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Permissions API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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

    const hasPermission = userRoles?.some((ur: any) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp: any) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: permission, error: createError } = await serviceClient
      .from('rbac_permissions')
      .insert({
        name: body.name,
        display_name: body.display_name,
        description: body.description,
        resource: body.resource,
        action: body.action,
        is_active: true
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({ permission })
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Create Permission API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Permission ID required' }, { status: 400 })
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

    const hasPermission = userRoles?.some((ur: any) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp: any) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: permission, error: updateError } = await serviceClient
      .from('rbac_permissions')
      .update({
        display_name: body.display_name,
        description: body.description,
        resource: body.resource,
        action: body.action
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ permission })
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Update Permission API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Permission ID required' }, { status: 400 })
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

    const hasPermission = userRoles?.some((ur: any) => 
      ur.rbac_roles?.rbac_role_permissions?.some((rp: any) => 
        rp.rbac_permissions?.name === 'admin:rbac'
      )
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await serviceClient
      .from('rbac_permissions')
      .update({ is_active: false })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Delete Permission API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}