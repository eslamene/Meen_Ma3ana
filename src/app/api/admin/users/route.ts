import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import {
  AdminUserManagementService,
  AdminUserManagementError,
} from '@/lib/services/adminUserManagementService'

function toApiError(error: unknown): never {
  if (error instanceof AdminUserManagementError) {
    throw new ApiError(error.apiCode, error.message, error.status)
  }
  throw error
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, supabase, logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const noPhoneRaw = (searchParams.get('noPhone') || '').toLowerCase()
    const noPhone = ['1', 'true', 'yes'].includes(noPhoneRaw)

    if (page < 1) {
      throw new ApiError('VALIDATION_ERROR', 'Page must be greater than 0', 400)
    }

    if (limit < 1 || limit > 100) {
      throw new ApiError('VALIDATION_ERROR', 'Limit must be between 1 and 100', 400)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_users_access',
      'user',
      undefined,
      { endpoint: '/api/admin/users', page, limit, search, roleFilter, noPhone },
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

    const result = await AdminUserManagementService.listUsers(
      supabase,
      serviceRoleClient,
      { page, limit, search, roleFilter, sortBy, sortOrder, noPhone },
      logger
    )

    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: result.pagination,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      toApiError(error)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Users API error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch users', 500)
  }
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, supabase, logger } = context

  try {
    const body = await request.json()
    const { email, password, first_name, last_name, phone, notes, tags, role_ids } = body

    if (!email || !email.trim()) {
      throw new ApiError('VALIDATION_ERROR', 'Email is required', 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid email format', 400)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_create',
      'user',
      undefined,
      { email: email.trim() },
      ipAddress,
      userAgent
    )

    logger.info('Creating new user', { email: email.trim(), adminUserId: adminUser.id })

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

    const created = await AdminUserManagementService.createUser(
      supabase,
      serviceRoleClient,
      {
        email,
        password,
        first_name,
        last_name,
        phone,
        notes,
        tags,
        role_ids,
        adminUserId: adminUser.id,
        locale,
      },
      logger
    )

    return NextResponse.json({
      success: true,
      user: {
        id: created.userId,
        email: created.email,
        first_name: created.first_name,
        last_name: created.last_name,
        phone: created.phone,
      },
      message: created.message,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof AdminUserManagementError) {
      toApiError(error)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Create user API error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create user', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users',
})

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users',
})
