/**
 * AI Generation Settings Utility
 * 
 * Fetches AI content generation settings from ai_rules and ai_rule_parameters tables
 * Provides default values if settings are not found
 * 
 * NOTE: This is a compatibility layer. New code should use aiRulesService.ts directly.
 */

import { createClient } from '@/lib/supabase/server'
import { defaultLogger as logger } from '@/lib/logger'
import { getAIRuleParameter, combineAIRules } from './aiRulesService'

export interface AIGenerationSettings {
  // Title generation settings
  titleMaxLength: number
  titleMinLength: number
  titleStyle: string // e.g., "catchy", "emotional", "direct", "compelling"
  titleTone: string // e.g., "professional", "friendly", "urgent", "hopeful"
  
  // Description generation settings
  descriptionMaxLength: number
  descriptionMinLength: number
  descriptionStyle: string // e.g., "storytelling", "factual", "emotional", "detailed"
  descriptionTone: string // e.g., "professional", "compassionate", "urgent", "hopeful"
  descriptionStructure: string // e.g., "paragraph", "structured", "narrative"
  
  // General settings
  includeCallToAction: boolean
  avoidLongStories: boolean
  focusOnNeeds: boolean
  emphasizeImpact: boolean
  
  // Content rules (dynamic - can be added through UI)
  contentRules: Map<string, string> // Key-value pairs of rule_key -> rule_value
  
  // Rule instruction templates (stored in DB)
  ruleInstructionTemplates: Map<string, string> // Key: 'ai.rule.instruction.{rule_key}.{lang}.{condition}', Value: template text
  
  // Rule metadata (stored in DB)
  ruleMetadata: Map<string, any> // Key: 'ai.rule.metadata.{rule_key}', Value: JSON metadata object
  ruleConditions: Map<string, any> // Key: 'ai.rule.condition.{condition_name}', Value: JSON condition definition
  ruleValueSources: Map<string, any> // Key: 'ai.rule.value_source.{source_name}', Value: JSON value source mapping
  
  // Prompt templates (stored in DB)
  promptTemplates: Map<string, string> // Key: 'ai.prompt.{type}.{section}.{lang}', Value: template text with placeholders
}

// Default settings
const DEFAULT_SETTINGS: AIGenerationSettings = {
  titleMaxLength: 80,
  titleMinLength: 10,
  titleStyle: 'catchy',
  titleTone: 'compassionate',
  
  descriptionMaxLength: 2000,
  descriptionMinLength: 100,
  descriptionStyle: 'structured',
  descriptionTone: 'compassionate',
  descriptionStructure: 'paragraph',
  
  includeCallToAction: true,
  avoidLongStories: true,
  focusOnNeeds: true,
  emphasizeImpact: true,
  
  contentRules: new Map([
    ['location_restriction', 'Egypt'],
    ['no_names_unless_provided', 'true'],
    ['no_personal_data_unless_provided', 'true'],
  ]),
  ruleInstructionTemplates: new Map(),
  ruleMetadata: new Map(),
  ruleConditions: new Map(),
  ruleValueSources: new Map(),
  promptTemplates: new Map(),
}

/**
 * Fetches AI generation settings from system_config
 * Returns default values if settings are not found
 */
export async function getAIGenerationSettings(): Promise<AIGenerationSettings> {
  try {
    const supabase = await createClient()
    
    // Fetch all AI-related settings (including dynamic rules)
    // First get all known AI settings
    const knownKeys = [
      'ai.title.max_length',
      'ai.title.min_length',
      'ai.title.style',
      'ai.title.tone',
      'ai.description.max_length',
      'ai.description.min_length',
      'ai.description.style',
      'ai.description.tone',
      'ai.description.structure',
      'ai.include_call_to_action',
      'ai.avoid_long_stories',
      'ai.focus_on_needs',
      'ai.emphasize_impact',
    ]
    
    const { data: knownData, error: knownError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', knownKeys)
    
    // Then get all dynamic rules (keys starting with 'ai.rule.' but not instruction templates)
    const { data: rulesData, error: rulesError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.rule.%')
      .not('config_key', 'like', 'ai.rule.instruction.%')
    
    // Get rule instruction templates
    const { data: templatesData, error: templatesError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.rule.instruction.%')
    
    // Get rule metadata
    const { data: metadataData, error: metadataError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.rule.metadata.%')
    
    // Get rule conditions
    const { data: conditionsData, error: conditionsError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.rule.condition.%')
    
    // Get rule value sources
    const { data: valueSourcesData, error: valueSourcesError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.rule.value_source.%')
    
    // Get prompt templates
    const { data: promptData, error: promptError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', 'ai')
      .like('config_key', 'ai.prompt.%')
    
    const error = knownError || rulesError || templatesError || metadataError || conditionsError || valueSourcesError || promptError
    const data = [
      ...(knownData || []), 
      ...(rulesData || []), 
      ...(templatesData || []),
      ...(metadataData || []),
      ...(conditionsData || []),
      ...(valueSourcesData || []),
      ...(promptData || [])
    ]

    if (error) {
      logger.warn('Error fetching AI generation settings from system_config, using defaults:', { error })
      return DEFAULT_SETTINGS
    }

    // Log if no data returned
    if (!data || data.length === 0) {
      logger.warn('No AI generation settings found in system_config, using defaults')
      return DEFAULT_SETTINGS
    }

    // Convert array to object for easier access
    const settingsMap = new Map(
      data.map(item => [item.config_key, item.config_value])
    )

    // Extract content rules, instruction templates, metadata, conditions, value sources, and prompt templates
    const contentRules = new Map<string, string>()
    const ruleInstructionTemplates = new Map<string, string>()
    const ruleMetadata = new Map<string, any>()
    const ruleConditions = new Map<string, any>()
    const ruleValueSources = new Map<string, any>()
    const promptTemplates = new Map<string, string>()
    
    settingsMap.forEach((value, key) => {
      if (key.startsWith('ai.rule.instruction.')) {
        // Store instruction templates with full key
        ruleInstructionTemplates.set(key, value)
      } else if (key.startsWith('ai.rule.metadata.')) {
        // Store rule metadata (parse JSON)
        try {
          const metadata = JSON.parse(value)
          ruleMetadata.set(key.replace('ai.rule.metadata.', ''), metadata)
        } catch (e) {
          logger.warn(`Failed to parse metadata for ${key}:`, { error: e })
        }
      } else if (key.startsWith('ai.rule.condition.')) {
        // Store rule conditions (parse JSON)
        try {
          const condition = JSON.parse(value)
          ruleConditions.set(key.replace('ai.rule.condition.', ''), condition)
        } catch (e) {
          logger.warn(`Failed to parse condition for ${key}:`, { error: e })
        }
      } else if (key.startsWith('ai.rule.value_source.')) {
        // Store rule value sources (parse JSON)
        try {
          const valueSource = JSON.parse(value)
          ruleValueSources.set(key.replace('ai.rule.value_source.', ''), valueSource)
        } catch (e) {
          logger.warn(`Failed to parse value source for ${key}:`, { error: e })
        }
      } else if (key.startsWith('ai.prompt.')) {
        // Store prompt templates with full key
        promptTemplates.set(key, value)
      } else if (key.startsWith('ai.rule.')) {
        // Store content rules (strip 'ai.rule.' prefix)
        const ruleKey = key.replace('ai.rule.', '')
        contentRules.set(ruleKey, value)
      }
    })

    // If no content rules found, use defaults
    if (contentRules.size === 0) {
      DEFAULT_SETTINGS.contentRules.forEach((value, key) => {
        contentRules.set(key, value)
      })
    }

    // Try to fetch from new ai_rules system (if tables exist)
    let titleMaxLengthVal: string | undefined
    let titleMinLengthVal: string | undefined
    let titleStyleVal: string | undefined
    let titleToneVal: string | undefined
    let descriptionMaxLengthVal: string | undefined
    let descriptionMinLengthVal: string | undefined
    let descriptionStyleVal: string | undefined
    let descriptionToneVal: string | undefined
    let descriptionStructureVal: string | undefined
    let locationRestrictionVal: string | undefined
    const rulesMap = new Map<string, boolean>()
    
    try {
      titleMaxLengthVal = await getAIRuleParameter('title.max_length', 'max_length')
      titleMinLengthVal = await getAIRuleParameter('title.min_length', 'min_length')
      titleStyleVal = await getAIRuleParameter('title.style', 'style')
      titleToneVal = await getAIRuleParameter('title.tone', 'tone')
      descriptionMaxLengthVal = await getAIRuleParameter('description.max_length', 'max_length')
      descriptionMinLengthVal = await getAIRuleParameter('description.min_length', 'min_length')
      descriptionStyleVal = await getAIRuleParameter('description.style', 'style')
      descriptionToneVal = await getAIRuleParameter('description.tone', 'tone')
      descriptionStructureVal = await getAIRuleParameter('description.structure', 'structure')
      locationRestrictionVal = await getAIRuleParameter('content.location_restriction', 'location')
      
      const { data: conditionalRules } = await supabase
        .from('ai_rules')
        .select('rule_key, is_active')
        .in('rule_key', [
          'title.focus_on_needs',
          'title.emphasize_impact',
          'description.avoid_long_stories',
          'description.focus_on_needs',
          'description.emphasize_impact',
          'description.include_cta',
          'content.no_names_unless_provided',
          'content.no_personal_data_unless_provided'
        ])
      
      if (conditionalRules) {
        for (const rule of conditionalRules) {
          rulesMap.set(rule.rule_key, rule.is_active)
        }
      }
    } catch (error) {
      // New tables don't exist yet, will use system_config fallback
    }

    const settings: AIGenerationSettings = {
      // Use new rules-based parameters, fallback to system_config, then defaults
      titleMaxLength: parseInt(titleMaxLengthVal || settingsMap.get('ai.title.max_length') || String(DEFAULT_SETTINGS.titleMaxLength), 10),
      titleMinLength: parseInt(titleMinLengthVal || settingsMap.get('ai.title.min_length') || String(DEFAULT_SETTINGS.titleMinLength), 10),
      titleStyle: titleStyleVal || settingsMap.get('ai.title.style') || DEFAULT_SETTINGS.titleStyle,
      titleTone: titleToneVal || settingsMap.get('ai.title.tone') || DEFAULT_SETTINGS.titleTone,
      
      descriptionMaxLength: parseInt(descriptionMaxLengthVal || settingsMap.get('ai.description.max_length') || String(DEFAULT_SETTINGS.descriptionMaxLength), 10),
      descriptionMinLength: parseInt(descriptionMinLengthVal || settingsMap.get('ai.description.min_length') || String(DEFAULT_SETTINGS.descriptionMinLength), 10),
      descriptionStyle: descriptionStyleVal || settingsMap.get('ai.description.style') || DEFAULT_SETTINGS.descriptionStyle,
      descriptionTone: descriptionToneVal || settingsMap.get('ai.description.tone') || DEFAULT_SETTINGS.descriptionTone,
      descriptionStructure: descriptionStructureVal || settingsMap.get('ai.description.structure') || DEFAULT_SETTINGS.descriptionStructure,
      
      // Use new rules-based active status, fallback to system_config, then defaults
      includeCallToAction: rulesMap.get('description.include_cta') ?? (settingsMap.get('ai.include_call_to_action') === 'true' || DEFAULT_SETTINGS.includeCallToAction),
      avoidLongStories: rulesMap.get('description.avoid_long_stories') ?? (settingsMap.get('ai.avoid_long_stories') === 'true' || DEFAULT_SETTINGS.avoidLongStories),
      focusOnNeeds: (rulesMap.get('title.focus_on_needs') ?? true) && (rulesMap.get('description.focus_on_needs') ?? true) ? (settingsMap.get('ai.focus_on_needs') === 'true' || DEFAULT_SETTINGS.focusOnNeeds) : false,
      emphasizeImpact: (rulesMap.get('title.emphasize_impact') ?? true) && (rulesMap.get('description.emphasize_impact') ?? true) ? (settingsMap.get('ai.emphasize_impact') === 'true' || DEFAULT_SETTINGS.emphasizeImpact) : false,
      
      // Content rules from new system
      contentRules: new Map([
        ['location_restriction', locationRestrictionVal || settingsMap.get('ai.rule.location_restriction') || 'Egypt'],
        ['no_names_unless_provided', rulesMap.get('content.no_names_unless_provided') ? 'true' : 'false'],
        ['no_personal_data_unless_provided', rulesMap.get('content.no_personal_data_unless_provided') ? 'true' : 'false'],
      ]),
      ruleInstructionTemplates,
      ruleMetadata,
      ruleConditions,
      ruleValueSources,
      promptTemplates,
    }
    
    return settings
  } catch (error) {
    logger.warn('Exception fetching AI generation settings from system_config, using defaults:', { error })
    return DEFAULT_SETTINGS
  }
}

/**
 * Get default settings (synchronous, for use in non-async contexts)
 */
export function getDefaultAIGenerationSettings(): AIGenerationSettings {
  return { ...DEFAULT_SETTINGS }
}

