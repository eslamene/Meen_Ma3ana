import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { previewUserMerge } from '@/lib/services/adminUserMergeService'

/**
 * GET /api/admin/users/merge/preview
 * Preview what will be merged before executing the merge
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  const { searchParams } = new URL(request.url)
  const fromUserId = searchParams.get('fromUserId')
  const toUserId = searchParams.get('toUserId')

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

  const payload = await previewUserMerge(
    serviceRoleClient,
    fromUserId || '',
    toUserId || '',
    logger
  )
  return NextResponse.json(payload)
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/merge/preview',
})
