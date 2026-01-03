/**
 * AI Rules Service
 * 
 * Fetches and combines AI rules from the ai_rules table
 * Rules are combined at runtime into a single AI system prompt, ordered by priority
 * Rules are cached at runtime for performance
 */

import { createClient } from '@/lib/supabase/server'
import { defaultLogger as logger } from '@/lib/logger'

export interface AIRule {
  rule_key: string
  instruction: string
  scope: 'global' | 'module' | 'feature' | 'tenant' | 'user' | 'role' | 'case'
  scope_reference?: string
  priority: number
  version: number
  is_active: boolean
  lang?: string | null
  metadata?: {
    category?: string
    type?: string
    language?: string
    conditional?: boolean
    [key: string]: any
  }
}

export interface AIRuleParameter {
  parameter_key: string
  parameter_value: string
}

// Cache for rules (in-memory, cleared on server restart)
let rulesCache: Map<string, AIRule[]> | null = null
let parametersCache: Map<string, Map<string, string>> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches all active AI rules from the database
 * Results are cached for performance
 */
export async function getAIRules(
  scope: 'global' | 'module' | 'feature' | 'tenant' | 'user' | 'role' | 'case' = 'global',
  scopeReference?: string
): Promise<AIRule[]> {
  try {
    const supabase = await createClient()
    
    // Build query
    let query = supabase
      .from('ai_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
    
    // Filter by scope
    if (scope === 'global') {
      query = query.eq('scope', 'global')
    } else {
      query = query.or(`scope.eq.global,scope.eq.${scope}${scopeReference ? `,scope_reference.eq.${scopeReference}` : ''}`)
    }
    
    const { data, error } = await query
    
    if (error) {
      logger.warn('Error fetching AI rules:', { error })
      return []
    }
    
    return (data || []).map(rule => ({
      rule_key: rule.rule_key,
      instruction: rule.instruction,
      scope: rule.scope,
      scope_reference: rule.scope_reference || undefined,
      priority: rule.priority,
      version: rule.version,
      is_active: rule.is_active,
      lang: rule.lang || undefined,
      metadata: rule.metadata || {},
    }))
  } catch (error) {
    logger.warn('Exception fetching AI rules:', { error })
    return []
  }
}

/**
 * Fetches all rule parameters from the database
 * Results are cached for performance
 */
export async function getAIRuleParameters(): Promise<Map<string, Map<string, string>>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ai_rule_parameters')
      .select('rule_key, parameter_key, parameter_value')
    
    if (error) {
      logger.warn('Error fetching AI rule parameters:', { error })
      return new Map()
    }
    
    // Group parameters by rule_key
    const parametersMap = new Map<string, Map<string, string>>()
    
    if (data) {
      for (const param of data) {
        if (!parametersMap.has(param.rule_key)) {
          parametersMap.set(param.rule_key, new Map())
        }
        parametersMap.get(param.rule_key)!.set(param.parameter_key, param.parameter_value)
      }
    }
    
    return parametersMap
  } catch (error) {
    logger.warn('Exception fetching AI rule parameters:', { error })
    return new Map()
  }
}

/**
 * Combines rules into a single instruction string
 * Rules are ordered by priority and parameters are substituted
 */
export async function combineAIRules(
  category: 'title' | 'description' | 'content',
  language: 'en' | 'ar' = 'en',
  scope: 'global' | 'module' | 'feature' | 'tenant' | 'user' | 'role' | 'case' = 'global',
  scopeReference?: string,
  additionalContext?: Record<string, any>
): Promise<string> {
  try {
    // Determine the appropriate scope for fetching rules
    // Title and description rules use 'case' scope, content rules use 'global' scope
    const fetchScope: 'global' | 'case' = category === 'content' ? 'global' : 'case'
    
    // Get rules and parameters
    const rules = await getAIRules(fetchScope, scopeReference)
    const parameters = await getAIRuleParameters()
    
    // Normalize language to uppercase for comparison (database stores 'AR', 'EN')
    const normalizedLang = language.toUpperCase()
    
    // Filter rules by category and language
    const filteredRules = rules.filter(rule => {
      const ruleCategory = rule.metadata?.category
      // Use lang column if available, otherwise fall back to metadata.language
      const ruleLanguage = rule.lang || rule.metadata?.language
      
      // Match category
      if (ruleCategory && ruleCategory !== category) {
        return false
      }
      
      // Match language
      // If rule has a language specified, it must match
      // If rule has no language (null/undefined), it applies to all languages
      if (ruleLanguage) {
        // Normalize rule language for comparison
        const normalizedRuleLang = typeof ruleLanguage === 'string' ? ruleLanguage.toUpperCase() : ruleLanguage
        if (normalizedRuleLang !== normalizedLang) {
          return false
        }
      }
      
      return true
    })
    
    // Process each rule: substitute parameters
    const processedInstructions: string[] = []
    
    for (const rule of filteredRules) {
      let instruction = rule.instruction
      
      // Substitute parameters from database
      const ruleParams = parameters.get(rule.rule_key)
      if (ruleParams) {
        for (const [key, value] of ruleParams.entries()) {
          instruction = instruction.replace(new RegExp(`{{${key}}}`, 'g'), value)
        }
      }
      
      // Substitute additional context parameters
      if (additionalContext) {
        for (const [key, value] of Object.entries(additionalContext)) {
          instruction = instruction.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
        }
      }
      
      processedInstructions.push(instruction)
    }
    
    return processedInstructions.join('\n\n')
  } catch (error) {
    logger.warn('Exception combining AI rules:', { error })
    return ''
  }
}

/**
 * Gets a specific rule parameter value
 */
export async function getAIRuleParameter(ruleKey: string, parameterKey: string): Promise<string | undefined> {
  try {
    const parameters = await getAIRuleParameters()
    return parameters.get(ruleKey)?.get(parameterKey)
  } catch (error) {
    logger.warn('Exception getting AI rule parameter:', { error })
    return undefined
  }
}

/**
 * Clears the rules cache (useful for testing or after updates)
 */
export function clearAIRulesCache(): void {
  rulesCache = null
  parametersCache = null
  cacheTimestamp = 0
}

