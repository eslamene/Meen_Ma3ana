import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import {
  AdminUserManagementService,
  AdminUserManagementError,
} from '@/lib/services/adminUserManagementService'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')?.trim()

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

    const result = await AdminUserManagementService.getNextContributorEmail(
      serviceRoleClient,
      phone || undefined,
      logger
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      throw new ApiError(error.apiCode, error.message, error.status)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error generating next contributor email:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to generate next contributor email', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/users/next-contributor-email',
})
