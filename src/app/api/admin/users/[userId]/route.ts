import { NextRequest, NextResponse } from 'next/server'
import {
  createGetHandlerWithParams,
  createPutHandlerWithParams,
  createDeleteHandlerWithParams,
  ApiHandlerContext,
} from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import {
  AdminUserManagementService,
  AdminUserManagementError,
} from '@/lib/services/adminUserManagementService'

function serviceRoleOrThrow(logger: { error: (m: string) => void }) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function toApiError(error: unknown): never {
  if (error instanceof AdminUserManagementError) {
    throw new ApiError(error.apiCode, error.message, error.status)
  }
  throw error
}

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, logger } = context
  const { userId } = params

  try {
    const serviceRoleClient = serviceRoleOrThrow(logger)
    const data = await AdminUserManagementService.getUserDetail(
      supabase,
      serviceRoleClient,
      userId,
      logger
    )
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      toApiError(error)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user', 500)
  }
}

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params
  const body = (await request.json()) as Record<string, unknown>

  try {
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

    const serviceRoleClient = serviceRoleOrThrow(logger)
    const data = await AdminUserManagementService.updateUser(
      supabase,
      serviceRoleClient,
      userId,
      body,
      logger
    )
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      toApiError(error)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update user', 500)
  }
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { userId: string }
) {
  const { supabase, user: adminUser, logger } = context
  const { userId } = params

  try {
    const serviceRoleClient = serviceRoleOrThrow(logger)

    const { ipAddress, userAgent } = extractRequestInfo(request)

    await AdminUserManagementService.deleteUser(supabase, serviceRoleClient, userId, logger, {
      afterChecksBeforeDelete: async ({ userId: uid, email }) => {
        await AuditService.logAdminAction(
          adminUser.id,
          'admin_user_delete',
          'user',
          uid,
          {
            deleted_user_email: email,
            deleted_user_id: uid,
          },
          ipAddress,
          userAgent
        )
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      toApiError(error)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting user:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete user', 500)
  }
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]',
})

export const PUT = createPutHandlerWithParams(putHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]',
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/[userId]',
})
