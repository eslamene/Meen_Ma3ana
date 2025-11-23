import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information including profile data
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ userId: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { userId } = await context.params
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Create service role client for admin operations
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

    // Fetch auth user
    const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Fetch user roles
    const { data: userRoles } = await supabase
      .from('admin_user_roles')
      .select(`
        id,
        role_id,
        assigned_at,
        assigned_by,
        is_active,
        admin_roles(id, name, display_name, description)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    // Get contribution count
    const { count: contributionCount } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', userId)

    const roles = (userRoles || []).map((ur: any) => {
      const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
      return role ? {
        id: ur.id,
        role_id: ur.role_id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        assigned_at: ur.assigned_at,
        assigned_by: ur.assigned_by
      } : null
    }).filter(Boolean)

    // Use email_confirmed_at from auth.users as source of truth for email_verified
    const emailVerified = authUser.user.email_confirmed_at !== null

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        email_confirmed_at: authUser.user.email_confirmed_at,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        user_metadata: authUser.user.user_metadata,
        // Profile data
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        phone: profile?.phone || null,
        address: profile?.address || null,
        profile_image: profile?.profile_image || null,
        role: profile?.role || 'donor',
        language: profile?.language || 'ar',
        is_active: profile?.is_active ?? true,
        email_verified: emailVerified, // Use auth.users.email_confirmed_at as source of truth
        // Additional data
        roles,
        contribution_count: contributionCount || 0
      }
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'User API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/users/[userId]
 * Update user profile (admin)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext<{ userId: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { userId } = await context.params
    const body = await request.json()
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_update',
      'user',
      userId,
      { updates: Object.keys(body) },
      ipAddress,
      userAgent
    )

    // Create service role client for admin operations
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

    // Verify user exists
    const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data for users table
    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.first_name !== undefined) profileUpdates.first_name = body.first_name || null
    if (body.last_name !== undefined) profileUpdates.last_name = body.last_name || null
    if (body.phone !== undefined) profileUpdates.phone = body.phone || null
    if (body.address !== undefined) profileUpdates.address = body.address || null
    if (body.language !== undefined) profileUpdates.language = body.language
    if (body.is_active !== undefined) profileUpdates.is_active = body.is_active
    // email_verified is read-only and synced from auth.users.email_confirmed_at
    // Do not allow manual updates to email_verified field

    // Update profile in users table
    const { data: updatedProfile, error: profileError } = await supabase
      .from('users')
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to update user profile', details: profileError.message },
        { status: 500 }
      )
    }

    // Update auth user metadata if email or other auth fields changed
    const authUpdates: Record<string, unknown> = {}
    if (body.email !== undefined && body.email !== authUser.user.email) {
      authUpdates.email = body.email
    }

    if (Object.keys(authUpdates).length > 0) {
      const { data: updatedAuthUser, error: authUpdateError } = await serviceRoleClient.auth.admin.updateUserById(
        userId,
        authUpdates
      )

      if (authUpdateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating auth user:', authUpdateError)
        // Don't fail the request, profile update succeeded
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        ...updatedProfile,
        email: authUser.user.email
      }
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'User update API error:', error)
    return NextResponse.json({
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete user (only if they have no contributions)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext<{ userId: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { userId } = await context.params
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Create service role client for admin operations
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

    // Verify user exists
    const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check for contributions - user cannot be deleted if they have any contributions
    const { count: contributionCount } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', userId)

    if (contributionCount && contributionCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with contributions',
          message: `User has ${contributionCount} contribution(s). Users with contributions cannot be deleted.`
        },
        { status: 400 }
      )
    }

    // Check for recurring contributions
    const { count: recurringContributionCount } = await supabase
      .from('recurring_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', userId)

    if (recurringContributionCount && recurringContributionCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with recurring contributions',
          message: `User has ${recurringContributionCount} recurring contribution(s). Users with recurring contributions cannot be deleted.`
        },
        { status: 400 }
      )
    }

    // Log the admin action before deletion
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_delete',
      'user',
      userId,
      { 
        deleted_user_email: authUser.user.email,
        deleted_user_id: userId
      },
      ipAddress,
      userAgent
    )

    // Delete from users table first (if exists)
    const { error: profileDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting user profile:', profileDeleteError)
      // Continue with auth deletion even if profile deletion fails
    }

    // Delete from auth.users
    const { error: authDeleteError } = await serviceRoleClient.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete user', details: authDeleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'User delete API error:', error)
    return NextResponse.json({
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

