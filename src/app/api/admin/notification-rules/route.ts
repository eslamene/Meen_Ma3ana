import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { NotificationRulesService } from '@/lib/services/notificationRulesService'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  const { supabase } = context

  try {
    const rules = await NotificationRulesService.listParsedRules(supabase)
    return NextResponse.json({ rules })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in getHandler:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load notification rules', 500)
  }
}

async function putHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { rules } = body

  const rulesArray = Array.isArray(rules) ? rules : Object.values(rules || {})

  if (!rulesArray || !Array.isArray(rulesArray)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid rules data. Expected array.', 400)
  }

  try {
    await NotificationRulesService.upsertRulesFromArray(supabase, rulesArray, user?.id)

    logger.info('Notification rules updated', {
      ruleCount: rulesArray.length,
      userId: user?.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Notification rules updated successfully',
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating notification rules:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update notification rules', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requirePermissions: ['admin:settings'],
  loggerContext: 'api/admin/notification-rules',
})

export const PUT = createPutHandler(putHandler, {
  requireAuth: true,
  requirePermissions: ['admin:settings'],
  loggerContext: 'api/admin/notification-rules',
})
