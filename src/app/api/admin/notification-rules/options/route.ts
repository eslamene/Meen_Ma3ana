import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { NotificationRulesService } from '@/lib/services/notificationRulesService'

/**
 * Get available options for notification rule conditions
 */
async function getHandler(_request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    const payload = await NotificationRulesService.getConditionOptions(supabase)
    return NextResponse.json(payload)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching notification rule options:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load notification rule options', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requirePermissions: ['admin:settings'],
  loggerContext: 'api/admin/notification-rules/options',
})
