import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AdminService } from '@/lib/admin/service'

/**
 * GET /api/profile/role
 * Get current user's role and permission information
 */
async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  try {
    // Get user's roles and permissions using AdminService
    const { roles, permissions } = await AdminService.getUserRolesAndPermissions(supabase, user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      roles,
      permissions,
      total_permissions: permissions.length,
      total_roles: roles.length
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles and permissions:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch roles and permissions', 500)
  }
}

export const GET = createGetHandler(handler, { requireAuth: true, loggerContext: 'api/profile/role' })
