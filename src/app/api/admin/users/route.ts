import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    logger.info('Starting users fetch...')
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Log the admin access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_users_access',
      'user',
      undefined,
      { endpoint: '/api/admin/users' },
      ipAddress,
      userAgent
    )

    logger.info('Admin user authenticated', { userId: adminUser.id })

    // Create service role client for admin operations (listUsers requires service role key)
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch users using service role client
    const { data: authUsers, error: usersError } = await serviceRoleClient.auth.admin.listUsers()
    if (usersError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users:', usersError)
      logger.error('Users fetch error details:', {
        code: usersError.code,
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint
      })
      throw usersError
    }

    logger.info('Users fetched:', authUsers.users.length)

    // Fetch user roles from admin_user_roles table using regular client (respects RLS)
    // Note: RLS policy allows admins to view all user roles via is_current_user_admin() function
    const { data: userRoles, error: rolesError } = await supabase
      .from('admin_user_roles')
      .select(`
        id,
        user_id,
        role_id,
        assigned_at,
        assigned_by,
        is_active,
        admin_roles(id, name, display_name, description)
      `)
      .eq('is_active', true)

    if (rolesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles:', rolesError)
      logger.error('User roles error details:', {
        code: rolesError.code,
        message: rolesError.message,
        details: rolesError.details,
        hint: rolesError.hint
      })
      // Don't throw, just return empty array - this allows the API to still return users
    }

    logger.info('User roles fetched:', userRoles?.length || 0)

    // Group roles by user_id
    const rolesByUserId = new Map<string, any[]>()
    if (userRoles) {
      userRoles.forEach((ur: any) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        if (role) {
          if (!rolesByUserId.has(ur.user_id)) {
            rolesByUserId.set(ur.user_id, [])
          }
          rolesByUserId.get(ur.user_id)!.push({
            id: ur.id,
            role_id: ur.role_id,
            name: role.name,
            display_name: role.display_name,
            description: role.description,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
          })
        }
      })
    }

    // Sanitize user data and attach roles
    const sanitizedUsers = authUsers.users.map(user => ({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      roles: rolesByUserId.get(user.id) || []
    }))

    return NextResponse.json({
      success: true,
      users: sanitizedUsers
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Users API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
