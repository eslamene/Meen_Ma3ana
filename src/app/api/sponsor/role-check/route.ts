import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  // Check if user is already a sponsor
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError) {
    logger.error('Error fetching user role:', userError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user role', 500)
  }

  const isSponsor = userData?.role === 'sponsor'
  const role = userData?.role || null

  return NextResponse.json({
    isSponsor,
    role
  })
}

export const GET = createGetHandler(handler, { requireAuth: true, loggerContext: 'api/sponsor/role-check' })

