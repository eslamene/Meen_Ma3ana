import { NextResponse } from 'next/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { NextRequest } from 'next/server'
import { requireAdminPermission, isDebugEnabled } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

/**
 * GET /api/debug/rbac-data
 * Debug endpoint to check RBAC data - requires admin access and debug mode
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    // Check if debug endpoints are enabled
    if (!isDebugEnabled()) {
      logger.info('Debug endpoint access denied - debug mode disabled')
      return NextResponse.json({
        success: false,
        error: 'Debug endpoints are disabled'
      }, { status: 404 })
    }

    logger.info('Debug API - Starting RBAC data fetch')
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user, supabase } = authResult
    
    // Log the debug access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      'debug_rbac_access',
      'rbac',
      undefined,
      { endpoint: '/api/debug/rbac-data' },
      ipAddress,
      userAgent
    )

    logger.info('Debug API - Admin user authenticated', {
      userId: user.id,
      userEmail: user.email
    })

    // Get user's roles (only if user exists)
    let userRoles = null
    let userRolesError = null
    
    const result = await supabase
      .from('rbac_user_roles')
      .select(`
        id,
        is_active,
        rbac_roles(
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    userRoles = result.data
    userRolesError = result.error

    // Get all roles (admin access verified)
    const { data: allRoles, error: rolesError } = await supabase
      .from('rbac_roles')
      .select('*')
      .eq('is_active', true)
      .order('level') // Use 'level' for ordering

    logger.info('Debug API - Roles query result', {
      count: allRoles?.length || 0,
      error: rolesError?.message
    })

    // Get all permissions (admin access verified)
    const { data: allPermissions, error: permissionsError } = await supabase
      .from('rbac_permissions')
      .select('*')
      .eq('is_active', true)

    // Get all users with their roles (admin access verified)
    const { data: allUsers, error: usersError } = await supabase
      .from('rbac_user_roles')
      .select(`
        user_id,
        is_active,
        assigned_at,
        rbac_roles(
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('is_active', true)

    // Get actual user data using Supabase admin API
    const userIds = [...new Set(allUsers?.map((assignment: { user_id: string }) => assignment.user_id) || [])]
    
    logger.info('Debug API - User IDs found', { count: userIds.length })
    
    // Fetch actual user data from Supabase Auth
    let userData: Array<{ id: string; email?: string; user_metadata?: { full_name?: string } }> = []
    try {
      logger.info('Fetching user data from Supabase Auth')
      const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        logger.error('Error fetching users from auth', usersError)
        throw usersError
      }
      
      // Filter to only include users that have role assignments
      userData = authUsers.users.filter(user => userIds.includes(user.id))
      logger.info('Successfully fetched user data', { userCount: userData.length })
      
    } catch (error) {
      logger.error('Failed to fetch user data', error)
      // Don't create fallback data - just use empty array
      userData = []
    }
    
    logger.info('Debug API - Users processed', { userCount: userData.length })

    // Group users by user_id to combine multiple roles
    const userMap = new Map()
    allUsers?.forEach((assignment: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!userMap.has(assignment.user_id)) {
        // Find the actual user data
        const authUser = userData.find((u: { id: string }) => u.id === assignment.user_id)
        
        userMap.set(assignment.user_id, {
          id: assignment.user_id,
          email: authUser?.email || 'User data unavailable',
          display_name: authUser?.user_metadata?.full_name || 
                       authUser?.email || 
                       'Unknown User',
          roles: []
        })
      }
      if (assignment.rbac_roles) {
        userMap.get(assignment.user_id).roles.push(assignment.rbac_roles)
      }
    })

    const transformedUsers = Array.from(userMap.values())

    logger.info('Debug API - Final response data', {
      rolesCount: allRoles?.length || 0,
      permissionsCount: allPermissions?.length || 0,
      usersCount: transformedUsers?.length || 0,
      errors: {
        roles: rolesError?.message,
        permissions: permissionsError?.message,
        users: usersError?.message
      }
    })

    return NextResponse.json({
      success: true,
      warning: 'This is a debug endpoint - not for production use',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown',
        roles: userRoles?.map(ur => ur.rbac_roles) || []
      },
      roles: allRoles || [],
      permissions: allPermissions || [],
      users: transformedUsers || [],
      counts: {
        roles: allRoles?.length || 0,
        permissions: allPermissions?.length || 0,
        users: transformedUsers?.length || 0
      },
      errors: {
        userRoles: userRolesError?.message,
        roles: rolesError?.message,
        permissions: permissionsError?.message,
        users: usersError?.message
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      user: null,
      data: {
        roles: [],
        permissions: [],
        userRoleAssignments: []
      },
      counts: {
        roles: 0,
        permissions: 0,
        userRoleAssignments: 0
      },
      errors: {
        general: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
