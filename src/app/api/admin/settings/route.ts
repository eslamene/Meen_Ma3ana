import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    const { SystemConfigService } = await import('@/lib/services/systemConfigService')
    const configs = await SystemConfigService.getAll(supabase)
    return NextResponse.json({ configs })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to load system settings', 500)
  }
}


async function putHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { configs } = body

  if (!configs || !Array.isArray(configs)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid settings data. Expected array of configs.', 400)
  }

  try {
    const { SystemConfigService } = await import('@/lib/services/systemConfigService')
    
    // Prepare configs for upsert
    const configsToUpsert = configs
      .filter(config => config.config_key && config.config_value !== undefined && config.config_value !== null)
      .map(config => ({
        config_key: config.config_key,
        config_value: config.config_value,
        description: config.description || null,
        description_ar: config.description_ar || null,
        group_type: config.group_type || null
      }))

    await SystemConfigService.upsertMany(supabase, configsToUpsert, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to update settings', 500)
  }
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { config_key, config_value, description, description_ar, group_type } = body

  if (!config_key || config_value === undefined || config_value === null) {
    throw new ApiError('VALIDATION_ERROR', 'config_key and config_value are required', 400)
  }

  try {
    const { SystemConfigService } = await import('@/lib/services/systemConfigService')
    
    const newConfig = await SystemConfigService.create(supabase, {
      config_key,
      config_value,
      description: description || null,
      description_ar: description_ar || null,
      group_type: group_type || null
    }, user.id)

    return NextResponse.json({ success: true, config: newConfig })
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ApiError('CONFLICT', `Config key '${config_key}' already exists. Use PUT to update it.`, 409)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', `Error creating config ${config_key}:`, error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to create config', 500)
  }
}

export const GET = createGetHandler(getHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })
export const PUT = createPutHandler(putHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })
export const POST = createPostHandler(postHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })

