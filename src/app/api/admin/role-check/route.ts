import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  try {
    // Use UserService to get user data
    const { UserService } = await import('@/lib/services/userService')
    const userData = await UserService.getById(supabase, user.id)

    if (!userData) {
      throw new ApiError('NOT_FOUND', 'User not found', 404)
    }

    // Check if user is admin using AdminService
    const { adminService } = await import('@/lib/admin/service')
    const isAdmin = await adminService.hasAnyRole(user.id, ['admin', 'super_admin'])
    
    // Get base role from user data (fallback for legacy role field)
    const role = userData.role || null

    if (!isAdmin) {
      throw new ApiError('FORBIDDEN', 'Forbidden', 403)
    }

    return NextResponse.json({
      isAdmin,
      role
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking admin role:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to check admin role', 500)
  }
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/role-check' })
