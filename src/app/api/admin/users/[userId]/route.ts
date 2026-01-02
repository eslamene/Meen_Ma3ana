import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { normalizePhoneNumber } from '@/lib/utils/phone'

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information including profile data
 */
async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, logger } = context
  const { userId } = params

    // Create service role client for admin operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
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
      throw new ApiError('NOT_FOUND', 'User not found', 404)
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user profile', 500)
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

    interface UserRoleEntry {
      id: string
      role_id: string
      assigned_at: string | null
      assigned_by: string | null
      admin_roles?: Array<{ id: string; name: string; display_name: string | null; description: string | null }> | { id: string; name: string; display_name: string | null; description: string | null }
    }
    const roles = (userRoles || []).map((ur: UserRoleEntry) => {
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
        notes: profile?.notes || null,
        tags: profile?.tags || [],
        // Additional data
        roles,
        contribution_count: contributionCount || 0
      }
    })
}

/**
 * PUT /api/admin/users/[userId]
 * Update user profile (admin)
 */
async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params
  const body = await request.json()

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
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
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
      throw new ApiError('NOT_FOUND', 'User not found', 404)
    }

    // Check if phone number is being updated and if it's already in use
    if (body.phone !== undefined && body.phone && body.phone.trim()) {
      // Remove all spaces from phone number before processing
      const phoneWithoutSpaces = body.phone.trim().replace(/\s/g, '')
      // Normalize phone number before checking uniqueness and storing
      const normalizedPhone = normalizePhoneNumber(phoneWithoutSpaces, '+20')
      
      // Get all users with phone numbers to check normalized uniqueness
      const { data: allUsersWithPhone, error: fetchError } = await supabase
        .from('users')
        .select('id, phone')
        .neq('id', userId)
        .not('phone', 'is', null)

      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users with phones:', fetchError)
      } else if (allUsersWithPhone) {
        // Check if normalized phone matches any existing normalized phone
        for (const user of allUsersWithPhone) {
          if (user.phone) {
            const existingNormalized = normalizePhoneNumber(user.phone, '+20')
            if (existingNormalized === normalizedPhone) {
              throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
            }
          }
        }
      }

      // Also check exact match (in case phone is already normalized)
      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', userId)
        .maybeSingle()

      if (exactError && exactError.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking phone exact match:', exactError)
      }

      if (exactMatch) {
        throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
      }

      // Store normalized phone for update
      body.phone = normalizedPhone
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
    if (body.notes !== undefined) profileUpdates.notes = body.notes || null
    if (body.tags !== undefined) profileUpdates.tags = body.tags || []
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
      // Check if error is due to duplicate phone number (unique constraint violation)
      if (profileError.code === '23505') {
        if (profileError.message.includes('phone') || profileError.message.includes('users_phone_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
        }
        if (profileError.message.includes('email') || profileError.message.includes('users_email_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Email is already in use by another account', 400)
        }
      }

      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user profile:', profileError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update user profile: ${profileError.message}`, 500)
    }

    // Update auth user email if email was explicitly changed
    const authUpdates: Record<string, unknown> = {}
    if (body.email !== undefined && body.email !== authUser.user.email) {
      // Allow explicit email update
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
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete user (only if they have no related activities)
 * Checks all tables that reference the user to prevent deletion if any activities exist
 */
async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params

    // Create service role client for admin operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
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
      throw new ApiError('NOT_FOUND', 'User not found', 404)
    }

    // Comprehensive check for all user-related activities
    // This ensures we don't delete users who have any historical or future activities
    const activityChecks = await Promise.all([
      // Contributions
      supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('donor_id', userId),
      // Recurring contributions
      supabase.from('recurring_contributions').select('*', { count: 'exact', head: true }).eq('donor_id', userId),
      // Cases - created by
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      // Cases - assigned to
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
      // Cases - sponsored by
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('sponsored_by', userId),
      // Case updates
      supabase.from('case_updates').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      // Case status history
      supabase.from('case_status_history').select('*', { count: 'exact', head: true }).eq('changed_by', userId),
      // Projects - created by
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      // Projects - assigned to
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
      // Sponsorships
      supabase.from('sponsorships').select('*', { count: 'exact', head: true }).eq('sponsor_id', userId),
      // Communications - sender
      supabase.from('communications').select('*', { count: 'exact', head: true }).eq('sender_id', userId),
      // Communications - recipient
      supabase.from('communications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId),
      // Notifications
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId),
      // Beneficiaries - created by
      supabase.from('beneficiaries').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      // Beneficiary documents - uploaded by
      supabase.from('beneficiary_documents').select('*', { count: 'exact', head: true }).eq('uploaded_by', userId),
      // Category detection rules - created by
      supabase.from('category_detection_rules').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      // Category detection rules - updated by
      supabase.from('category_detection_rules').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      // Landing stats - updated by
      supabase.from('landing_stats').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      // System config - updated by
      supabase.from('system_config').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      // System content - updated by
      supabase.from('system_content').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      // Contribution approval status - admin_id
      supabase.from('contribution_approval_status').select('*', { count: 'exact', head: true }).eq('admin_id', userId),
      // Admin user roles - user has roles assigned (user_id)
      supabase.from('admin_user_roles').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      // Admin user roles - user assigned roles to others (assigned_by)
      supabase.from('admin_user_roles').select('*', { count: 'exact', head: true }).eq('assigned_by', userId),
    ])

    // Map activity types to user-friendly names
    const activityTypes = [
      { name: 'contributions', field: 'donor_id' },
      { name: 'recurring contributions', field: 'donor_id' },
      { name: 'cases created', field: 'created_by' },
      { name: 'cases assigned', field: 'assigned_to' },
      { name: 'cases sponsored', field: 'sponsored_by' },
      { name: 'case updates', field: 'created_by' },
      { name: 'case status changes', field: 'changed_by' },
      { name: 'projects created', field: 'created_by' },
      { name: 'projects assigned', field: 'assigned_to' },
      { name: 'sponsorships', field: 'sponsor_id' },
      { name: 'messages sent', field: 'sender_id' },
      { name: 'messages received', field: 'recipient_id' },
      { name: 'notifications', field: 'recipient_id' },
      { name: 'beneficiaries created', field: 'created_by' },
      { name: 'beneficiary documents', field: 'uploaded_by' },
      { name: 'category rules created', field: 'created_by' },
      { name: 'category rules updated', field: 'updated_by' },
      { name: 'landing stats updated', field: 'updated_by' },
      { name: 'system config updated', field: 'updated_by' },
      { name: 'system content updated', field: 'updated_by' },
      { name: 'contribution approvals', field: 'admin_id' },
      { name: 'role assignments', field: 'user_id' },
      { name: 'role assignments made', field: 'assigned_by' },
    ]

    // Check for any activities
    const activities = activityChecks
      .map((result, index) => ({
        type: activityTypes[index].name,
        count: result.count || 0
      }))
      .filter(activity => activity.count > 0)

    // Separate critical activities (cannot be auto-removed) from removable activities (role assignments)
    const criticalActivities = activities.filter(a => 
      !a.type.includes('role assignments')
    )
    const roleAssignmentActivities = activities.filter(a => 
      a.type.includes('role assignments')
    )

    // If there are critical activities, block deletion
    if (criticalActivities.length > 0) {
      const activitySummary = activities
        .map(a => `${a.count} ${a.type}`)
        .join(', ')
      
      throw new ApiError('VALIDATION_ERROR', `User has related activities: ${activitySummary}. Users with activities cannot be deleted to maintain data integrity.`, 400)
    }

    // If only role assignments exist, automatically remove them before deletion
    if (roleAssignmentActivities.length > 0) {
      logger.info('Removing role assignments before user deletion', {
        userId,
        roleAssignments: roleAssignmentActivities
      })

      // Remove all role assignments for this user (both where user_id = userId and where assigned_by = userId)
      const { error: removeUserRolesError } = await supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)

      if (removeUserRolesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing user roles:', removeUserRolesError)
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to remove user role assignments: ${removeUserRolesError.message}`, 500)
      }

      // Also remove role assignments where this user assigned roles to others
      const { error: removeAssignedRolesError } = await supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('assigned_by', userId)

      if (removeAssignedRolesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing assigned roles:', removeAssignedRolesError)
        // Log but don't throw - this is less critical
        logger.warn('Some role assignments may not have been removed', {
          userId,
          error: removeAssignedRolesError
        })
      }

      logger.info('Role assignments removed successfully', {
        userId,
        removedUserRoles: roleAssignmentActivities.find(a => a.type === 'role assignments')?.count || 0,
        removedAssignedRoles: roleAssignmentActivities.find(a => a.type === 'role assignments made')?.count || 0
      })
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
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to delete user: ${authDeleteError.message}`, 500)
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/[userId]' 
})

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/[userId]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/[userId]' 
})

