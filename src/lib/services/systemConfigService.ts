/**
 * System Config Service
 * Handles all system configuration-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface SystemConfig {
  id?: string
  config_key: string
  config_value: string
  description?: string | null
  description_ar?: string | null
  group_type?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateSystemConfigData {
  config_key: string
  config_value: string
  description?: string | null
  description_ar?: string | null
  group_type?: string | null
}

export interface UpdateSystemConfigData {
  config_value?: string
  description?: string | null
  description_ar?: string | null
  group_type?: string | null
}

export class SystemConfigService {
  /**
   * Get all system config entries
   * @param supabase - Supabase client (server-side only)
   */
  static async getAll(supabase: SupabaseClient): Promise<SystemConfig[]> {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, description, description_ar, group_type')
      .order('group_type', { ascending: true })
      .order('config_key', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching system config:', error)
      throw new Error(`Failed to fetch system config: ${error.message}`)
    }

    return (data || []) as SystemConfig[]
  }

  /**
   * Get system config by key
   * @param supabase - Supabase client (server-side only)
   */
  static async getByKey(supabase: SupabaseClient, configKey: string): Promise<SystemConfig | null> {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', configKey)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching system config by key:', error)
      throw new Error(`Failed to fetch system config: ${error.message}`)
    }

    return data as SystemConfig | null
  }

  /**
   * Get all configs with their group types for pattern analysis
   * @param supabase - Supabase client (server-side only)
   */
  static async getConfigsWithGroupTypes(supabase: SupabaseClient): Promise<Array<{ config_key: string; group_type: string | null }>> {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, group_type')
      .not('group_type', 'is', null)

    if (error) {
      defaultLogger.error('Error fetching configs for pattern analysis:', error)
      throw new Error(`Failed to fetch configs: ${error.message}`)
    }

    return (data || []) as Array<{ config_key: string; group_type: string | null }>
  }

  /**
   * Determine group type based on existing patterns
   * @param supabase - Supabase client (server-side only)
   * @param configKey - The config key to determine group type for
   */
  static async determineGroupType(supabase: SupabaseClient, configKey: string): Promise<string> {
    try {
      // Get all configs with group types
      const configs = await this.getConfigsWithGroupTypes(supabase)

      if (configs.length === 0) {
        // No configs exist yet, use fallback logic
        const firstSegment = configKey.split('.')[0]
        if (firstSegment && firstSegment !== configKey) {
          return firstSegment
        }
        return 'general'
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
      for (const [groupType, keys] of grouped.entries()) {
        // Check prefix patterns
        for (const key of keys) {
          if (key.includes('.')) {
            const parts = key.split('.')
            if (parts.length > 1) {
              const prefix = parts[0] + '.'
              if (configKey.startsWith(prefix)) {
                return groupType
              }
            }
          } else {
            // Exact match
            if (configKey === key) {
              return groupType
            }
          }
        }
      }

      // Fallback: Infer from config_key structure
      const firstSegment = configKey.split('.')[0]
      if (firstSegment && firstSegment !== configKey) {
        return firstSegment
      }

      return 'general'
    } catch (error) {
      defaultLogger.error('Error determining group type:', error)
      return 'general'
    }
  }

  /**
   * Create a new system config entry
   * @param supabase - Supabase client (server-side only)
   * @param data - Config data
   * @param userId - User ID for updated_by field
   */
  static async create(
    supabase: SupabaseClient,
    data: CreateSystemConfigData,
    userId: string
  ): Promise<SystemConfig> {
    // Check if config already exists
    const existing = await this.getByKey(supabase, data.config_key)
    if (existing) {
      throw new Error(`Config key '${data.config_key}' already exists`)
    }

    // Determine group_type automatically if not provided
    const groupType = data.group_type || await this.determineGroupType(supabase, data.config_key)

    const { data: newConfig, error } = await supabase
      .from('system_config')
      .insert({
        config_key: data.config_key,
        config_value: String(data.config_value),
        description: data.description || null,
        description_ar: data.description_ar || null,
        group_type: groupType,
        updated_by: userId
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating system config:', error)
      throw new Error(`Failed to create system config: ${error.message}`)
    }

    return newConfig as SystemConfig
  }

  /**
   * Update a system config entry
   * @param supabase - Supabase client (server-side only)
   * @param configKey - Config key to update
   * @param data - Update data
   * @param userId - User ID for updated_by field
   */
  static async update(
    supabase: SupabaseClient,
    configKey: string,
    data: UpdateSystemConfigData,
    userId: string
  ): Promise<SystemConfig> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId
    }

    if (data.config_value !== undefined) {
      updateData.config_value = String(data.config_value)
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.description_ar !== undefined) {
      updateData.description_ar = data.description_ar
    }
    if (data.group_type !== undefined) {
      updateData.group_type = data.group_type || await this.determineGroupType(supabase, configKey)
    }

    const { data: updatedConfig, error } = await supabase
      .from('system_config')
      .update(updateData)
      .eq('config_key', configKey)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Config key '${configKey}' not found`)
      }
      defaultLogger.error('Error updating system config:', error)
      throw new Error(`Failed to update system config: ${error.message}`)
    }

    return updatedConfig as SystemConfig
  }

  /**
   * Upsert (create or update) system config entries
   * @param supabase - Supabase client (server-side only)
   * @param configs - Array of config entries to upsert
   * @param userId - User ID for updated_by field
   */
  static async upsertMany(
    supabase: SupabaseClient,
    configs: Array<CreateSystemConfigData & { config_key: string }>,
    userId: string
  ): Promise<void> {
    for (const config of configs) {
      if (!config.config_key || config.config_value === undefined || config.config_value === null) {
        continue // Skip invalid entries
      }

      const existing = await this.getByKey(supabase, config.config_key)

      if (existing) {
        // Update existing
        await this.update(supabase, config.config_key, {
          config_value: config.config_value,
          description: config.description,
          description_ar: config.description_ar,
          group_type: config.group_type
        }, userId)
      } else {
        // Create new
        await this.create(supabase, {
          config_key: config.config_key,
          config_value: config.config_value,
          description: config.description,
          description_ar: config.description_ar,
          group_type: config.group_type
        }, userId)
      }
    }
  }
}

