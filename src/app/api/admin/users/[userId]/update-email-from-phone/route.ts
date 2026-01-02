import { NextRequest, NextResponse } from 'next/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { normalizePhoneNumber, extractCountryCode } from '@/lib/utils/phone'

/**
 * POST /api/admin/users/[userId]/update-email-from-phone
 * Update user email based on phone number (admin action)
 */
async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params

  try {
    // Get email from request body (user can edit it)
    const body = await request.json()
    const providedEmail = body.email?.trim()

    if (!providedEmail) {
      throw new ApiError('VALIDATION_ERROR', 'Email is required', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(providedEmail)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid email format', 400)
    }

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_update_email_from_phone',
      'user',
      userId,
      { newEmail: providedEmail },
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

    // Verify user exists and get current profile
    const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
    
    if (authError || !authUser) {
      throw new ApiError('NOT_FOUND', 'User not found', 404)
    }

    // Get user profile to get current email
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('phone, email')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user profile', 500)
    }

    const newEmail = providedEmail

    // Check if this email already exists (for another user)
    const { data: existingEmailUser, error: emailCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', newEmail)
      .neq('id', userId)
      .maybeSingle()

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking email uniqueness:', emailCheckError)
    }

    if (existingEmailUser) {
      throw new ApiError('VALIDATION_ERROR', `Email ${newEmail} is already in use by another account`, 400)
    }

    // Update email in users table
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505' && updateError.message.includes('email')) {
        throw new ApiError('VALIDATION_ERROR', 'Email is already in use by another account', 400)
      }
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user email:', updateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update user email: ${updateError.message}`, 500)
    }

    // Update email in auth.users
    const { data: updatedAuthUser, error: authUpdateError } = await serviceRoleClient.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (authUpdateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating auth email:', authUpdateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update auth email: ${authUpdateError.message}`, 500)
    }

    logger.info('Successfully updated email from phone', { 
      userId, 
      oldEmail: userProfile.email,
      newEmail,
      phone: userProfile.phone
    })

    return NextResponse.json({
      success: true,
      message: `Email updated to ${newEmail} based on phone number`,
      email: newEmail,
      oldEmail: userProfile.email
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating email from phone:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update email from phone', 500)
  }
}

export const POST = createPostHandlerWithParams(postHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]/update-email-from-phone'
})

