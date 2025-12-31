import { NextRequest, NextResponse } from 'next/server'
import { createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id: ruleId } = params

  try {
    const configKey = `notification_rule_${ruleId}`

    // Delete the rule using Supabase
    const { error: deleteError } = await supabase
      .from('system_config')
      .delete()
      .eq('config_key', configKey)
      .eq('group_type', 'notification_rules')

    if (deleteError) {
      throw deleteError
    }

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

