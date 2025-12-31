import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    // Fetch notification rules from system_config
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'notification_rules')
      .order('config_key')

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching notification rules:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load notification rules', 500)
    }

    // Parse rules from config - new structure uses array of rules
    const rules: any[] = []
    for (const config of data || []) {
      try {
        const rule = JSON.parse(config.config_value)
        // Support both old format (with action) and new format (with id)
        if (rule.id || rule.action) {
          rules.push(rule)
        }
      } catch (parseError) {
        logger.warn('Failed to parse notification rule', {
          configKey: config.config_key,
          error: parseError,
        })
      }
    }

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

  // Support both array (new format) and object (old format)
  const rulesArray = Array.isArray(rules) ? rules : Object.values(rules || {})

  if (!rulesArray || !Array.isArray(rulesArray)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid rules data. Expected array.', 400)
  }

  try {
    // Upsert each rule as a system_config entry
    for (const ruleData of rulesArray) {
      if (!ruleData.id && !ruleData.action) {
        continue // Skip invalid rules
      }

      // Use id if available, otherwise fall back to action (for backward compatibility)
      const ruleId = ruleData.id || ruleData.action
      const configKey = `notification_rule_${ruleId}`
      const configValue = JSON.stringify(ruleData)

      // Check if config exists using Supabase
      const { data: existing, error: checkError } = await supabase
        .from('system_config')
        .select('id')
        .eq('config_key', configKey)
        .eq('group_type', 'notification_rules')
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors are not
        throw checkError
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('system_config')
          .update({
            config_value: configValue,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq('config_key', configKey)
          .eq('group_type', 'notification_rules')

        if (updateError) {
          throw updateError
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('system_config')
          .insert({
            config_key: configKey,
            config_value: configValue,
            group_type: 'notification_rules',
            description: ruleData.description || `Notification rule: ${ruleData.name || ruleId}`,
            updated_by: user?.id,
          })

        if (insertError) {
          throw insertError
        }
      }
    }

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

