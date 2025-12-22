import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError) {
    logger.error('Error fetching user role:', userError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user role', 500)
  }

  const isAdmin = userData?.role === 'admin'
  const role = userData?.role || null

  if (!isAdmin) {
    throw new ApiError('FORBIDDEN', 'Forbidden', 403)
  }

  return NextResponse.json({
    isAdmin,
    role
  })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/role-check' })

