import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auditService, extractRequestInfo } from '@/lib/services/auditService'
import { requirePermission } from '@/lib/security/guards'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

// Create admin client for API routes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/admin/rbac/users
 * Get all users with their assigned roles
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
    // Get all users with their roles
    const { data: userRoleAssignments, error: assignmentsError } = await supabaseAdmin
      .from('rbac_user_roles')
      .select(`
        user_id,
        assigned_at,
        assigned_by,
        rbac_roles(
          id,
          role_id: id,
          name,
          display_name,
          description
        )
      `)
      .eq('is_active', true)

    if (assignmentsError) {
      logger.logStableError('DATABASE_CONNECTION_FAILED', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    // Get unique user IDs
    const userIds = [...new Set(userRoleAssignments?.map((assignment: any) => assignment.user_id) || [])]
    
    // Fetch actual user data from Supabase Auth
    let userData: Array<{ id: string; email?: string; user_metadata?: { full_name?: string } }> = []
    try {
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (usersError) {
        logger.logStableError('EXTERNAL_SERVICE_ERROR', usersError)
        throw usersError
      }
      
      // Filter to only include users that have role assignments
      userData = authUsers.users.filter(user => userIds.includes(user.id))
      
    } catch (error) {
      logger.logStableError('EXTERNAL_SERVICE_ERROR', error)
      // Don't create fallback data - just use empty array
      userData = []
    }

    // Group users by user_id
    const userMap = new Map()
    userRoleAssignments?.forEach((assignment: any) => {
      const userId = assignment.user_id
      if (!userMap.has(userId)) {
        const authUser = userData.find(u => u.id === userId)
        userMap.set(userId, {
          id: userId,
          email: authUser?.email || 'User data unavailable',
          display_name: authUser?.user_metadata?.full_name || 
                       authUser?.email || 
                       'Unknown User',
          created_at: assignment.assigned_at,
          roles: []
        })
      }
      
      if (assignment.rbac_roles) {
        userMap.get(userId).roles.push({
          id: assignment.rbac_roles.id,
          role_id: assignment.rbac_roles.role_id,
          name: assignment.rbac_roles.name,
          display_name: assignment.rbac_roles.display_name,
          description: assignment.rbac_roles.description,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by
        })
      }
    })

    const users = Array.from(userMap.values())

    return NextResponse.json({ users })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/rbac/users
 * Assign roles to a user
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
    const { userId, roleIds } = body

    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      logger.warn('Invalid request body for role assignment', { userId, roleIds })
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Remove existing role assignments for this user
    const { error: deleteError } = await supabaseAdmin
      .from('rbac_user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      logger.logStableError('DATABASE_CONNECTION_FAILED', deleteError)
      return NextResponse.json({ error: 'Failed to remove existing roles' }, { status: 500 })
    }

    // Add new role assignments
    const roleAssignments = roleIds.map((roleId: string) => ({
      user_id: userId,
      role_id: roleId,
      is_active: true,
      assigned_by: user.id, // Set to the authenticated user who made the assignment
      assigned_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseAdmin
      .from('rbac_user_roles')
      .insert(roleAssignments)

    if (insertError) {
      logger.logStableError('DATABASE_CONNECTION_FAILED', insertError)
      return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 })
    }

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await auditService.logAction(
      user.id,
      'roles_assigned',
      'user',
      userId,
      { 
        assigned_roles: roleIds,
        roles_count: roleIds.length
      },
      ipAddress,
      userAgent
    )

    logger.info('Roles assigned successfully', { userId, roleIds })

    return NextResponse.json({ 
      success: true, 
      message: 'Roles assigned successfully' 
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}