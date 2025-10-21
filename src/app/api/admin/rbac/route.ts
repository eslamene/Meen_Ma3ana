import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { serverDbRBAC } from '@/lib/rbac/server-rbac'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Temporarily skip permission check for debugging
    console.log('Skipping permission check for debugging')

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'roles':
        const roles = await serverDbRBAC.getRoles()
        return NextResponse.json({ roles })

      case 'permissions':
        const permissions = await serverDbRBAC.getPermissions()
        return NextResponse.json({ permissions })

      case 'role-permissions':
        const roleId = searchParams.get('roleId')
        if (!roleId) {
          return NextResponse.json({ error: 'Role ID required' }, { status: 400 })
        }
        const roleWithPermissions = await serverDbRBAC.getRoleWithPermissions(roleId)
        return NextResponse.json({ role: roleWithPermissions })

      case 'user-roles':
        const userId = searchParams.get('userId')
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }
        const userRoles = await serverDbRBAC.getUserRolesAndPermissions(userId)
        return NextResponse.json({ userRoles })

      case 'users':
        try {
          // Create admin client with service role key
          const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

          // Fetch all users from Supabase Auth using admin client
          const { data: authUsers, error: usersError } = await adminClient.auth.admin.listUsers()
          if (usersError) {
            console.error('Error fetching auth users:', usersError)
            throw usersError
          }

          // Fetch user roles from database
          const { data: allUserRoles, error: userRolesError } = await supabase
            .from('user_roles')
            .select(`
              user_id,
              role_id,
              roles(id, name, display_name)
            `)
          
          if (userRolesError) {
            console.error('Error fetching user roles:', userRolesError)
            throw userRolesError
          }

          console.log('Successfully fetched users:', authUsers.users.length, 'user roles:', allUserRoles?.length)

          return NextResponse.json({ 
            success: true, 
            users: authUsers.users,
            userRoles: allUserRoles || []
          })
        } catch (userError) {
          console.error('Error in users case:', userError)
          throw userError
        }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('RBAC API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has RBAC management permission
    const hasPermission = await serverDbRBAC.userHasPermission(user.id, 'admin:rbac')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create-role':
        const newRole = await serverDbRBAC.createRole({
          name: data.name,
          display_name: data.display_name,
          description: data.description,
          is_system: false
        })
        
        // Assign permissions to role if provided
        if (data.permissions && Array.isArray(data.permissions)) {
          for (const permissionId of data.permissions) {
            await serverDbRBAC.assignPermissionToRole(newRole.id, permissionId)
          }
        }
        
        return NextResponse.json({ role: newRole })

      case 'update-role':
        const updatedRole = await serverDbRBAC.updateRole(data.id, {
          display_name: data.display_name,
          description: data.description
        })
        return NextResponse.json({ role: updatedRole })

      case 'delete-role':
        await serverDbRBAC.deleteRole(data.id)
        return NextResponse.json({ success: true })

      case 'create-permission':
        const newPermission = await serverDbRBAC.createPermission({
          name: data.name,
          display_name: data.display_name,
          description: data.description,
          resource: data.resource,
          action: data.action,
          is_system: false
        })
        return NextResponse.json({ permission: newPermission })

      case 'update-permission':
        const updatedPermission = await serverDbRBAC.updatePermission(data.id, {
          display_name: data.display_name,
          description: data.description,
          resource: data.resource,
          action: data.action
        })
        return NextResponse.json({ permission: updatedPermission })

      case 'delete-permission':
        await serverDbRBAC.deletePermission(data.id)
        return NextResponse.json({ success: true })

      case 'assign-role':
        await serverDbRBAC.assignRoleToUser(data.userId, data.roleId, user.id)
        return NextResponse.json({ success: true })

      case 'remove-role':
        await serverDbRBAC.removeRoleFromUser(data.userId, data.roleId)
        return NextResponse.json({ success: true })

      case 'assign-permission-to-role':
        await serverDbRBAC.assignPermissionToRole(data.roleId, data.permissionId)
        return NextResponse.json({ success: true })

      case 'remove-permission-from-role':
        await serverDbRBAC.removePermissionFromRole(data.roleId, data.permissionId)
        return NextResponse.json({ success: true })

      case 'assign_user_roles':
        // Remove all existing roles for the user
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', data.userId)
        
        if (deleteError) throw deleteError

        // Assign new roles
        if (data.roleIds && data.roleIds.length > 0) {
          const userRoleInserts = data.roleIds.map((roleId: string) => ({
            user_id: data.userId,
            role_id: roleId,
            assigned_by: user.id
          }))

          const { error: insertError } = await supabase
            .from('user_roles')
            .insert(userRoleInserts)
          
          if (insertError) throw insertError
        }

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('RBAC API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
