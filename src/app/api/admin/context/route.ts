import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { getAdminContextForSession } from '@/lib/services/adminContextService'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    const payload = await getAdminContextForSession(supabase)
    return NextResponse.json(payload)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'admin context failed', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', e instanceof Error ? e.message : 'Failed to load admin context', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: false,
  loggerContext: 'api/admin/context',
})
