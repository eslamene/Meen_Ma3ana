import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

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

    // Fetch users using admin client (now properly authenticated)
    const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users:', usersError)
      throw usersError
    }

    logger.info('Users fetched:', authUsers.users.length)

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        roles(id, name, display_name)
      `)

    if (rolesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles:', rolesError)
      // Don't throw, just return empty array
    }

    logger.info('User roles fetched:', userRoles?.length || 0)

    // Sanitize user data - remove sensitive fields
    const sanitizedUsers = authUsers.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      role: user.user_metadata?.role || 'donor',
      // Remove sensitive fields like phone, app_metadata, etc.
    }))

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
      userRoles: userRoles || []
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Users API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
