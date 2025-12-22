import { NextRequest, NextResponse } from 'next/server'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { getAppUrl } from '@/lib/utils/app-url'
import { env } from '@/config/env'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

/**
 * POST /api/admin/users/[userId]/reset-password
 * Reset user password (admin-initiated)
 * 
 * This sends a password reset email to the user
 */
async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { logger, user: adminUser } = context
  const { userId } = params

  // Log the admin action
  const { ipAddress, userAgent } = extractRequestInfo(request)
  await AuditService.logAdminAction(
    adminUser.id,
    'admin_password_reset',
    'user',
    userId,
    {},
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

  // Get user email
  const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
  
  if (authError || !authUser || !authUser.user.email) {
    throw new ApiError('NOT_FOUND', 'User not found', 404)
  }

  // Get locale from request or default to 'en'
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') || 'en'

  // Send password reset email
  const redirectTo = `${getAppUrl()}/${locale}/auth/reset-password`
  
  const { error: resetError } = await serviceRoleClient.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
    options: {
      redirectTo
    }
  })

  if (resetError) {
    logger.error('Error generating password reset link:', resetError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to send password reset email', 500, { details: resetError.message })
  }

  // Note: generateLink doesn't actually send the email, we need to use resetPasswordForEmail
  // But that requires the anon key. Let's use the service role to send it.
  const { error: emailError } = await serviceRoleClient.auth.resetPasswordForEmail(
    authUser.user.email,
    {
      redirectTo
    }
  )

  if (emailError) {
    logger.error('Error sending password reset email:', emailError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to send password reset email', 500, { details: emailError.message })
  }

  return NextResponse.json({
    success: true,
    message: 'Password reset email sent successfully'
  })
}

export const POST = createPostHandlerWithParams<{ userId: string }>(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/users/[userId]/reset-password' })

