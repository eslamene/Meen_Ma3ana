/**
 * AI Rule Service
 * Handles all AI rule and parameter-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface AIRule {
  id: string
  rule_key: string
  instruction: string
  scope: string
  scope_reference: string | null
  priority: number
  version: number
  is_active: boolean
  lang: string | null
  metadata: any
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface AIRuleParameter {
  id: string
  rule_key: string
  parameter_key: string
  parameter_value: string
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface CreateAIRuleData {
  rule_key: string
  instruction: string
  scope?: string
  scope_reference?: string | null
  priority?: number
  version?: number
  is_active?: boolean
  lang?: string | null
  metadata?: any
}

export interface UpdateAIRuleData {
  rule_key?: string
  instruction?: string
  scope?: string
  scope_reference?: string | null
  priority?: number
  version?: number
  is_active?: boolean
  lang?: string | null
  metadata?: any
}

export interface CreateAIRuleParameterData {
  rule_key: string
  parameter_key: string
  parameter_value: string
}

export interface UpdateAIRuleParameterData {
  rule_key?: string
  parameter_key?: string
  parameter_value?: string
}

export class AIRuleService {
  /**
   * Get all AI rules
   * @param supabase - Supabase client (server-side only)
   */
  static async getAllRules(supabase: SupabaseClient): Promise<AIRule[]> {
    const { data, error } = await supabase
      .from('ai_rules')
      .select('*')
      .order('priority', { ascending: true })
      .order('rule_key', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching AI rules:', error)
      throw new Error(`Failed to fetch AI rules: ${error.message}`)
    }

    return (data || []) as AIRule[]
  }

  /**
   * Get AI rule by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Rule ID
   */
  static async getRuleById(supabase: SupabaseClient, id: string): Promise<AIRule | null> {
    const { data, error } = await supabase
      .from('ai_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching AI rule:', error)
      throw new Error(`Failed to fetch AI rule: ${error.message}`)
    }

    return data as AIRule | null
  }

  /**
   * Get AI rule by rule_key
   * @param supabase - Supabase client (server-side only)
   * @param ruleKey - Rule key
   */
  static async getRuleByKey(supabase: SupabaseClient, ruleKey: string): Promise<AIRule | null> {
    const { data, error } = await supabase
      .from('ai_rules')
      .select('*')
      .eq('rule_key', ruleKey)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching AI rule by key:', error)
      throw new Error(`Failed to fetch AI rule: ${error.message}`)
    }

    return data as AIRule | null
  }

  /**
   * Get max priority for rules
   * @param supabase - Supabase client (server-side only)
   */
  static async getMaxPriority(supabase: SupabaseClient): Promise<number> {
    const { data, error } = await supabase
      .from('ai_rules')
      .select('priority')
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching max priority:', error)
      throw new Error(`Failed to fetch max priority: ${error.message}`)
    }

    return data?.priority || 100
  }

  /**
   * Create a new AI rule
   * @param supabase - Supabase client (server-side only)
   * @param data - Rule data
   * @param userId - User ID for created_by/updated_by
   */
  static async createRule(
    supabase: SupabaseClient,
    data: CreateAIRuleData,
    userId: string
  ): Promise<AIRule> {
    // Check if rule_key already exists
    const existing = await this.getRuleByKey(supabase, data.rule_key)
    if (existing) {
      throw new Error(`Rule with key "${data.rule_key}" already exists`)
    }

    // Get max priority if not provided
    const priority = data.priority || (await this.getMaxPriority(supabase)) + 1

    // Normalize lang
    let normalizedLang: string | null = null
    if (data.lang && typeof data.lang === 'string' && data.lang.trim()) {
      normalizedLang = data.lang
        .split(',')
        .map(l => l.trim().toUpperCase())
        .filter(l => l.length > 0)
        .join(',')
      if (normalizedLang === '') {
        normalizedLang = null
      }
    }

    // Normalize metadata
    const normalizedMetadata = (data.metadata && typeof data.metadata === 'object' && Object.keys(data.metadata).length > 0) 
      ? data.metadata 
      : null

    const { data: newRule, error } = await supabase
      .from('ai_rules')
      .insert({
        rule_key: data.rule_key,
        instruction: data.instruction,
        scope: data.scope || 'global',
        scope_reference: data.scope_reference || null,
        priority,
        version: data.version || 1,
        is_active: data.is_active !== undefined ? data.is_active : true,
        lang: normalizedLang,
        metadata: normalizedMetadata,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating AI rule:', error)
      throw new Error(`Failed to create AI rule: ${error.message}`)
    }

    return newRule as AIRule
  }

  /**
   * Update an AI rule
   * @param supabase - Supabase client (server-side only)
   * @param id - Rule ID
   * @param data - Update data
   * @param userId - User ID for updated_by
   */
  static async updateRule(
    supabase: SupabaseClient,
    id: string,
    data: UpdateAIRuleData,
    userId: string
  ): Promise<AIRule> {
    // If rule_key is being changed, check for conflicts
    if (data.rule_key) {
      const existingRule = await this.getRuleById(supabase, id)
      if (existingRule && existingRule.rule_key !== data.rule_key) {
        const conflictingRule = await this.getRuleByKey(supabase, data.rule_key)
        if (conflictingRule) {
          throw new Error(`Rule with key "${data.rule_key}" already exists`)
        }

        // Update all associated parameters to use the new rule_key
        await supabase
          .from('ai_rule_parameters')
          .update({ rule_key: data.rule_key })
          .eq('rule_key', existingRule.rule_key)
      }
    }

    // Normalize lang if provided
    let normalizedLang: string | null | undefined = data.lang
    if (data.lang !== undefined && data.lang !== null) {
      if (typeof data.lang === 'string' && data.lang.trim()) {
        normalizedLang = data.lang
          .split(',')
          .map(l => l.trim().toUpperCase())
          .filter(l => l.length > 0)
          .join(',')
        if (normalizedLang === '') {
          normalizedLang = null
        }
      } else {
        normalizedLang = null
      }
    }

    // Normalize metadata
    let normalizedMetadata: any = undefined
    if (data.metadata !== undefined) {
      normalizedMetadata = (data.metadata && typeof data.metadata === 'object' && Object.keys(data.metadata).length > 0) 
        ? data.metadata 
        : null
    }

    const updateData: Record<string, unknown> = {
      updated_by: userId,
    }

    if (data.rule_key !== undefined) updateData.rule_key = data.rule_key
    if (data.instruction !== undefined) updateData.instruction = data.instruction
    if (data.scope !== undefined) updateData.scope = data.scope
    if (data.scope_reference !== undefined) updateData.scope_reference = data.scope_reference
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.version !== undefined) updateData.version = data.version
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (normalizedLang !== undefined) updateData.lang = normalizedLang
    if (normalizedMetadata !== undefined) updateData.metadata = normalizedMetadata

    const { data: updatedRule, error } = await supabase
      .from('ai_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating AI rule:', error)
      throw new Error(`Failed to update AI rule: ${error.message}`)
    }

    return updatedRule as AIRule
  }

  /**
   * Delete an AI rule
   * @param supabase - Supabase client (server-side only)
   * @param id - Rule ID
   */
  static async deleteRule(supabase: SupabaseClient, id: string): Promise<void> {
    // Get rule_key first to delete associated parameters
    const rule = await this.getRuleById(supabase, id)
    if (!rule) {
      throw new Error('Rule not found')
    }

    // Delete all parameters for this rule
    const { error: paramsError } = await supabase
      .from('ai_rule_parameters')
      .delete()
      .eq('rule_key', rule.rule_key)

    if (paramsError) {
      defaultLogger.warn('Error deleting rule parameters:', paramsError)
    }

    // Delete the rule
    const { error } = await supabase
      .from('ai_rules')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting AI rule:', error)
      throw new Error(`Failed to delete AI rule: ${error.message}`)
    }
  }

  /**
   * Delete an AI rule by rule_key
   * @param supabase - Supabase client (server-side only)
   * @param ruleKey - Rule key
   */
  static async deleteRuleByKey(supabase: SupabaseClient, ruleKey: string): Promise<void> {
    // Delete all parameters for this rule
    const { error: paramsError } = await supabase
      .from('ai_rule_parameters')
      .delete()
      .eq('rule_key', ruleKey)

    if (paramsError) {
      defaultLogger.warn('Error deleting rule parameters:', paramsError)
    }

    // Delete the rule
    const { error } = await supabase
      .from('ai_rules')
      .delete()
      .eq('rule_key', ruleKey)

    if (error) {
      defaultLogger.error('Error deleting AI rule:', error)
      throw new Error(`Failed to delete AI rule: ${error.message}`)
    }
  }

  /**
   * Get all AI rule parameters
   * @param supabase - Supabase client (server-side only)
   */
  static async getAllParameters(supabase: SupabaseClient): Promise<AIRuleParameter[]> {
    const { data, error } = await supabase
      .from('ai_rule_parameters')
      .select('*')
      .order('rule_key', { ascending: true })
      .order('parameter_key', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching AI rule parameters:', error)
      throw new Error(`Failed to fetch AI rule parameters: ${error.message}`)
    }

    return (data || []) as AIRuleParameter[]
  }

  /**
   * Get AI rule parameter by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Parameter ID
   */
  static async getParameterById(supabase: SupabaseClient, id: string): Promise<AIRuleParameter | null> {
    const { data, error } = await supabase
      .from('ai_rule_parameters')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching AI rule parameter:', error)
      throw new Error(`Failed to fetch AI rule parameter: ${error.message}`)
    }

    return data as AIRuleParameter | null
  }

  /**
   * Create a new AI rule parameter
   * @param supabase - Supabase client (server-side only)
   * @param data - Parameter data
   * @param userId - User ID for created_by/updated_by
   */
  static async createParameter(
    supabase: SupabaseClient,
    data: CreateAIRuleParameterData,
    userId: string
  ): Promise<AIRuleParameter> {
    const { data: newParam, error } = await supabase
      .from('ai_rule_parameters')
      .insert({
        rule_key: data.rule_key,
        parameter_key: data.parameter_key,
        parameter_value: data.parameter_value || '',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating AI rule parameter:', error)
      throw new Error(`Failed to create AI rule parameter: ${error.message}`)
    }

    return newParam as AIRuleParameter
  }

  /**
   * Update an AI rule parameter
   * @param supabase - Supabase client (server-side only)
   * @param id - Parameter ID
   * @param data - Update data
   * @param userId - User ID for updated_by
   */
  static async updateParameter(
    supabase: SupabaseClient,
    id: string,
    data: UpdateAIRuleParameterData,
    userId: string
  ): Promise<AIRuleParameter> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId
    }

    if (data.rule_key !== undefined) updateData.rule_key = data.rule_key
    if (data.parameter_key !== undefined) updateData.parameter_key = data.parameter_key
    if (data.parameter_value !== undefined) updateData.parameter_value = data.parameter_value

    const { data: updatedParam, error } = await supabase
      .from('ai_rule_parameters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating AI rule parameter:', error)
      throw new Error(`Failed to update AI rule parameter: ${error.message}`)
    }

    return updatedParam as AIRuleParameter
  }

  /**
   * Delete an AI rule parameter
   * @param supabase - Supabase client (server-side only)
   * @param id - Parameter ID
   */
  static async deleteParameter(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_rule_parameters')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting AI rule parameter:', error)
      throw new Error(`Failed to delete AI rule parameter: ${error.message}`)
    }
  }
}

