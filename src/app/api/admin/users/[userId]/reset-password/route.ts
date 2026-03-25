import { NextRequest, NextResponse } from 'next/server'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createPostHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import {
  AdminUserManagementService,
  AdminUserManagementError,
} from '@/lib/services/adminUserManagementService'

async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { logger, user: adminUser } = context
  const { userId } = params

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

  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') || 'en'

  try {
    await AdminUserManagementService.sendAdminPasswordResetEmail(
      serviceRoleClient,
      userId,
      locale,
      logger
    )
  } catch (error) {
    if (error instanceof AdminUserManagementError) {
      throw new ApiError(error.apiCode, error.message, error.status)
    }
    throw error
  }

  return NextResponse.json({
    success: true,
    message: 'Password reset email sent successfully',
  })
}

export const POST = createPostHandlerWithParams<{ userId: string }>(handler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]/reset-password',
})
