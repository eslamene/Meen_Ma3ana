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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const roleId = searchParams.get('roleId')
    const userId = searchParams.get('userId')

    // Use service client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (type) {
      case 'roles':
        logger.info('Fetching roles...')
        try {
          const { data: roles, error: rolesError } = await serviceClient
            .from('rbac_roles')
            .select('*')
            .eq('is_active', true)
            .order('name')
          
          if (rolesError) throw rolesError
          
          logger.info('Roles fetched successfully:', roles.length)
          return NextResponse.json({ success: true, roles })
        } catch (rolesError) {
          logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching roles:', rolesError)
          return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
        }

      case 'permissions':
        const { data: permissions, error: permissionsError } = await serviceClient
          .from('rbac_permissions')
          .select('*')
          .eq('is_active', true)
          .order('name')
        
        if (permissionsError) throw permissionsError
        return NextResponse.json({ success: true, permissions })

      case 'role-permissions':
        if (!roleId) {
          return NextResponse.json({ error: 'Role ID required' }, { status: 400 })
        }
        
        const { data: roleWithPermissions, error: rolePermsError } = await serviceClient
          .from('rbac_role_permissions')
          .select(`
            id,
            rbac_permissions (*)
          `)
          .eq('role_id', roleId)
          .eq('is_active', true)
        
        if (rolePermsError) throw rolePermsError
        return NextResponse.json({ role: roleWithPermissions })

      case 'user-roles':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }
        
        const { data: userRoles, error: userRolesError } = await serviceClient
          .from('rbac_user_roles')
          .select(`
            id,
            rbac_roles (*),
            rbac_roles (
              rbac_role_permissions (
                rbac_permissions (*)
              )
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
        
        if (userRolesError) throw userRolesError
        return NextResponse.json({ userRoles })

      case 'users':
        const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers()
        if (usersError) throw usersError
        return NextResponse.json({ users: users.users })

      case 'modules':
        const { data: modules, error: modulesError } = await serviceClient
          .from('rbac_modules')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
        
        if (modulesError) throw modulesError
        return NextResponse.json({ success: true, modules })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'RBAC API Error:', error)
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
    const { action, data } = body

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

    switch (action) {
      case 'create-role':
        const { data: newRole, error: createRoleError } = await serviceClient
          .from('rbac_roles')
          .insert({
            name: data.name,
            display_name: data.display_name,
            description: data.description,
            is_active: true
          })
          .select()
          .single()
        
        if (createRoleError) throw createRoleError
        
        // Assign permissions to role if provided
        if (data.permissions && Array.isArray(data.permissions)) {
          const rolePermissions = data.permissions.map((permissionId: string) => ({
            role_id: newRole.id,
            permission_id: permissionId,
            is_active: true
          }))
          
          await serviceClient
            .from('rbac_role_permissions')
            .insert(rolePermissions)
        }
        
        return NextResponse.json({ role: newRole })

      case 'update-role':
        const { data: updatedRole, error: updateRoleError } = await serviceClient
          .from('rbac_roles')
          .update({
            display_name: data.display_name,
            description: data.description
          })
          .eq('id', data.id)
          .select()
          .single()
        
        if (updateRoleError) throw updateRoleError
        return NextResponse.json({ role: updatedRole })

      case 'delete-role':
        await serviceClient
          .from('rbac_roles')
          .update({ is_active: false })
          .eq('id', data.id)
        
        return NextResponse.json({ success: true })

      case 'create-permission':
        const { data: newPermission, error: createPermError } = await serviceClient
          .from('rbac_permissions')
          .insert({
            name: data.name,
            display_name: data.display_name,
            description: data.description,
            resource: data.resource,
            action: data.action,
            is_active: true
          })
          .select()
          .single()
        
        if (createPermError) throw createPermError
        return NextResponse.json({ permission: newPermission })

      case 'update-permission':
        const { data: updatedPermission, error: updatePermError } = await serviceClient
          .from('rbac_permissions')
          .update({
            display_name: data.display_name,
            description: data.description,
            resource: data.resource,
            action: data.action
          })
          .eq('id', data.id)
          .select()
          .single()
        
        if (updatePermError) throw updatePermError
        return NextResponse.json({ permission: updatedPermission })

      case 'delete-permission':
        await serviceClient
          .from('rbac_permissions')
          .update({ is_active: false })
          .eq('id', data.id)
        
        return NextResponse.json({ success: true })

      case 'assign-role':
        await serviceClient
          .from('rbac_user_roles')
          .insert({
            user_id: data.userId,
            role_id: data.roleId,
            assigned_by: user.id,
            is_active: true
          })
        
        return NextResponse.json({ success: true })

      case 'remove-role':
        await serviceClient
          .from('rbac_user_roles')
          .update({ is_active: false })
          .eq('user_id', data.userId)
          .eq('role_id', data.roleId)
        
        return NextResponse.json({ success: true })

      case 'assign-permission-to-role':
        await serviceClient
          .from('rbac_role_permissions')
          .insert({
            role_id: data.roleId,
            permission_id: data.permissionId,
            is_active: true
          })
        
        return NextResponse.json({ success: true })

      case 'remove-permission-from-role':
        await serviceClient
          .from('rbac_role_permissions')
          .update({ is_active: false })
          .eq('role_id', data.roleId)
          .eq('permission_id', data.permissionId)
        
        return NextResponse.json({ success: true })

      case 'assign_user_roles':
        // Handle bulk role assignment
        const { userId: targetUserId, roleIds } = data
        
        // Remove existing roles
        await serviceClient
          .from('rbac_user_roles')
          .update({ is_active: false })
          .eq('user_id', targetUserId)
          .eq('is_active', true)

        // Add new roles
        if (roleIds && roleIds.length > 0) {
          const newRoleAssignments = roleIds.map((roleId: string) => ({
            user_id: targetUserId,
            role_id: roleId,
            assigned_by: user.id,
            is_active: true
          }))

          await serviceClient
            .from('rbac_user_roles')
            .insert(newRoleAssignments)
        }

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'RBAC API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}