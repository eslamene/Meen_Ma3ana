import { NextRequest, NextResponse } from 'next/server'
import { createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { NotificationRulesService } from '@/lib/services/notificationRulesService'

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id: ruleId } = params

  try {
    await NotificationRulesService.deleteByRuleId(supabase, ruleId)

    logger.info('Notification rule deleted', {
      ruleId,
      userId: user?.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Notification rule deleted successfully',
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting notification rule:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete notification rule', 500)
  }
}

export const DELETE = createDeleteHandlerWithParams(deleteHandler, {
  requireAuth: true,
  requirePermissions: ['admin:settings'],
  loggerContext: 'api/admin/notification-rules/[id]',
})
