/**
 * Clean Administration API Routes
 * API endpoints for managing roles, permissions, and user access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

/**
 * GET /api/admin/roles
 * Get all roles with permissions and users count
 */
export async function GET(request: NextRequest) {
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

    // Fetch roles with permissions (left join to include roles without permissions)
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        *,
        admin_role_permissions(
          permission_id,
          admin_permissions(*)
        )
      `)
      .eq('is_active', true)
      .order('level', { ascending: true })

    if (rolesError) {
      defaultLogger.error('Error fetching roles:', rolesError)
      throw rolesError
    }

    // Fetch user counts separately (using a different approach to avoid RLS issues)
    const { data: userRoles, error: userRolesError } = await supabase
      .from('admin_user_roles')
      .select('role_id, user_id')
      .eq('is_active', true)

    if (userRolesError) {
      defaultLogger.error('Error fetching user roles for counts:', userRolesError)
    }

    // Count users per role
    const usersCountByRole = new Map<string, number>()
    if (userRoles) {
      userRoles.forEach((ur: any) => {
        const count = usersCountByRole.get(ur.role_id) || 0
        usersCountByRole.set(ur.role_id, count + 1)
      })
    }

    // Map roles with counts
    const rolesWithCounts = (roles || []).map((role: any) => {
      // Extract permissions from nested structure
      const permissions = (role.admin_role_permissions || [])
        .map((rp: any) => {
          // Handle both array and object formats
          const perm = Array.isArray(rp.admin_permissions) 
            ? rp.admin_permissions[0] 
            : rp.admin_permissions
          return perm
        })
        .filter(Boolean)
      
      return {
        ...role,
        permissions: permissions,
        permissions_count: permissions.length,
        users_count: usersCountByRole.get(role.id) || 0
      }
    })

    defaultLogger.info('Roles fetched with counts:', {
      totalRoles: rolesWithCounts.length,
      rolesWithPermissions: rolesWithCounts.filter(r => r.permissions_count > 0).length,
      rolesWithUsers: rolesWithCounts.filter(r => r.users_count > 0).length
    })

    return NextResponse.json({ roles: rolesWithCounts })
  } catch (error) {
    defaultLogger.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create roles
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, display_name, display_name_ar, description, description_ar, level } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'Name and display_name are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_roles')
      .insert({
        name,
        display_name,
        display_name_ar,
        description,
        description_ar,
        level: level || 0,
        is_system: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ role: data })
  } catch (error) {
    defaultLogger.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

