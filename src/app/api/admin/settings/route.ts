import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { Logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  // Fetch ALL system config entries with group_type
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value, description, description_ar, group_type')
    .order('group_type, config_key')

  if (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load system settings', 500)
  }

  return NextResponse.json({ configs: data || [] })
}

// Cache for group type patterns to avoid repeated database queries
let groupTypePatternsCache: Map<string, { prefixes: string[], exactMatches: string[] }> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Dynamically determines group_type based on existing configs in the database
 * Learns patterns from existing configs and uses them to classify new ones
 */
async function getGroupType(supabase: SupabaseClient, configKey: string, logger: Logger): Promise<string> {
  try {
    // Refresh cache if expired or not initialized
    const now = Date.now()
    if (!groupTypePatternsCache || (now - cacheTimestamp) > CACHE_TTL) {
      await refreshGroupTypePatterns(supabase, logger)
      cacheTimestamp = now
    }

    // Use cached patterns to determine group type
    if (groupTypePatternsCache) {
      for (const [groupType, patterns] of groupTypePatternsCache.entries()) {
        // Check prefix patterns
        for (const prefix of patterns.prefixes) {
          if (configKey.startsWith(prefix)) {
            return groupType
          }
        }
        // Check exact matches
        if (patterns.exactMatches.includes(configKey)) {
          return groupType
        }
      }
    }

    // Fallback: Infer from config_key structure if no patterns match
    // Extract first segment before first dot as potential group type
    const firstSegment = configKey.split('.')[0]
    if (firstSegment && firstSegment !== configKey) {
      // If it's a dot-separated key, use the first segment as group type
      return firstSegment
    }

    // Default fallback
    return 'general'
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error determining group type:', error)
    // Fallback to general on error
    return 'general'
  }
}

/**
 * Refreshes the group type patterns cache by analyzing existing configs
 */
async function refreshGroupTypePatterns(supabase: SupabaseClient, logger: Logger): Promise<void> {
  try {
    // Fetch all existing configs with their group types
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('config_key, group_type')
      .not('group_type', 'is', null)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching configs for pattern analysis:', error)
      return
    }

    if (!configs || configs.length === 0) {
      // No configs exist yet, initialize empty cache
      // The getGroupType function will use fallback logic to infer group types
      groupTypePatternsCache = new Map()
      return
    }

    // Group configs by group_type
    const grouped = new Map<string, string[]>()
    for (const config of configs) {
      const groupType = config.group_type || 'general'
      if (!grouped.has(groupType)) {
        grouped.set(groupType, [])
      }
      grouped.get(groupType)!.push(config.config_key)
    }

    // Analyze patterns for each group type
    const patterns = new Map<string, { prefixes: string[], exactMatches: string[] }>()
    
    for (const [groupType, keys] of grouped.entries()) {
      const prefixes = new Set<string>()
      const exactMatches: string[] = []

      for (const key of keys) {
        // Check if key contains dots (indicating a prefix pattern)
        if (key.includes('.')) {
          // Extract common prefix (everything before the last dot)
          const parts = key.split('.')
          if (parts.length > 1) {
            // Use the first segment as prefix pattern
            const prefix = parts[0] + '.'
            prefixes.add(prefix)
          }
        } else {
          // No dots, treat as exact match
          exactMatches.push(key)
        }
      }

      patterns.set(groupType, {
        prefixes: Array.from(prefixes),
        exactMatches: exactMatches
      })
    }

    groupTypePatternsCache = patterns
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error refreshing group type patterns:', error)
    // Keep existing cache on error
  }
}

async function putHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { configs } = body

  if (!configs || !Array.isArray(configs)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid settings data. Expected array of configs.', 400)
  }

  // Update or insert each config
  for (const config of configs) {
    if (!config.config_key || config.config_value === undefined || config.config_value === null) {
      continue // Skip invalid entries
    }

    const groupType = config.group_type || await getGroupType(supabase, config.config_key, logger)

    // Check if config exists
    const { data: existing, error: checkError } = await supabase
      .from('system_config')
      .select('id')
      .eq('config_key', config.config_key)
      .maybeSingle()

    if (existing && !checkError) {
      // Update existing config
      const { error } = await supabase
        .from('system_config')
        .update({
          config_value: String(config.config_value),
          description: config.description || null,
          description_ar: config.description_ar || null,
          group_type: groupType,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('config_key', config.config_key)

      if (error) {
        logger.logStableError('INTERNAL_SERVER_ERROR', `Error updating ${config.config_key}:`, error)
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update ${config.config_key}`, 500)
      }
    } else {
      // Insert new config
      const { error } = await supabase
        .from('system_config')
        .insert({
          config_key: config.config_key,
          config_value: String(config.config_value),
          description: config.description || null,
          description_ar: config.description_ar || null,
          group_type: groupType,
          updated_by: user.id
        })

      if (error) {
        logger.logStableError('INTERNAL_SERVER_ERROR', `Error creating ${config.config_key}:`, error)
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create ${config.config_key}`, 500)
      }
    }
  }

  return NextResponse.json({ success: true })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { config_key, config_value, description, description_ar, group_type } = body

  if (!config_key || config_value === undefined || config_value === null) {
    throw new ApiError('VALIDATION_ERROR', 'config_key and config_value are required', 400)
  }

  // Check if config already exists
  const { data: existing, error: checkError } = await supabase
    .from('system_config')
    .select('id')
    .eq('config_key', config_key)
    .maybeSingle()

  if (existing && !checkError) {
    throw new ApiError('CONFLICT', `Config key '${config_key}' already exists. Use PUT to update it.`, 409)
  }

  // Determine group_type automatically if not provided
  const finalGroupType = group_type || await getGroupType(supabase, config_key, logger)

  // Insert new config
  const { data: newConfig, error } = await supabase
    .from('system_config')
    .insert({
      config_key,
      config_value: String(config_value),
      description: description || null,
      description_ar: description_ar || null,
      group_type: finalGroupType,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', `Error creating config ${config_key}:`, error)
    throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create config: ${error.message}`, 500)
  }

  return NextResponse.json({ success: true, config: newConfig })
}

export const GET = createGetHandler(getHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })
export const PUT = createPutHandler(putHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })
export const POST = createPostHandler(postHandler, { requireAdmin: true, loggerContext: 'api/admin/settings' })

