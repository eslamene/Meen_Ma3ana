import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  try {
    // Get user's roles using AdminService to check for sponsor role
    const { adminService } = await import('@/lib/admin/service')
    const { roles } = await adminService.getUserRolesAndPermissions(user.id)
    
    // Check if user has sponsor role (check both role name and user role field)
    const hasSponsorRole = roles.some(r => r.name === 'sponsor')
    
    // Also check the user's base role field
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    const baseRole = userData?.role || null
    const isSponsor = hasSponsorRole || baseRole === 'sponsor'
    const role = baseRole

    return NextResponse.json({
      isSponsor,
      role
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking sponsor role:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to check sponsor role', 500)
  }
}

export const GET = createGetHandler(handler, { requireAuth: true, loggerContext: 'api/sponsor/role-check' })
