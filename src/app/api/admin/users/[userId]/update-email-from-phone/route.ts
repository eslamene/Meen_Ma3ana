import { NextRequest, NextResponse } from 'next/server'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import {
  AdminUserManagementService,
  AdminUserManagementError,
} from '@/lib/services/adminUserManagementService'

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params

  try {
    const body = await request.json()
    const providedEmail = body.email?.trim()

    if (!providedEmail) {
      throw new ApiError('VALIDATION_ERROR', 'Email is required', 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(providedEmail)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid email format', 400)
    }

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
          persistSession: false,
        },
      }
    )

    const result = await AdminUserManagementService.updateUserEmailFromPhone(
      supabase,
      serviceRoleClient,
      userId,
      providedEmail,
      logger
    )

    return NextResponse.json({
      success: true,
      message: `Email updated to ${result.newEmail} based on phone number`,
      email: result.newEmail,
      oldEmail: result.oldEmail,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      throw new ApiError(error.apiCode, error.message, error.status)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating email from phone:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update email from phone', 500)
  }
}

export const POST = createPostHandlerWithParams(postHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]/update-email-from-phone',
})
