import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, createPostHandler, createDeleteHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

interface AIRule {
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
}

interface AIRuleParameter {
  id: string
  rule_key: string
  parameter_key: string
  parameter_value: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/admin/settings/ai
 * Fetches all AI rules and parameters from the new tables
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    // Fetch all active AI rules
    const { data: rules, error: rulesError } = await supabase
      .from('ai_rules')
      .select('*')
      .order('priority', { ascending: true })
      .order('rule_key', { ascending: true })

    if (rulesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching AI rules:', rulesError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load AI rules', 500)
    }

    // Fetch all rule parameters
    const { data: parameters, error: paramsError } = await supabase
      .from('ai_rule_parameters')
      .select('*')
      .order('rule_key', { ascending: true })
      .order('parameter_key', { ascending: true })

    if (paramsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching AI rule parameters:', paramsError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load AI rule parameters', 500)
    }

    return NextResponse.json({
      rules: rules || [],
      parameters: parameters || [],
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error fetching AI settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500)
  }
}

/**
 * PUT /api/admin/settings/ai
 * Updates AI rules and parameters
 */
async function putHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { rules, parameters } = body

  if (!rules && !parameters) {
    throw new ApiError('VALIDATION_ERROR', 'Either rules or parameters must be provided', 400)
  }

  try {
    // Update rules if provided
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        const { id, rule_key, instruction, scope, scope_reference, priority, version, is_active, lang, metadata } = rule

        if (!id || !rule_key) {
          continue
        }

        // Check if rule_key is being changed - need to verify it doesn't conflict with existing rules
        const { data: existingRule } = await supabase
          .from('ai_rules')
          .select('rule_key')
          .eq('id', id)
          .single()

        if (existingRule && existingRule.rule_key !== rule_key) {
          // Rule key is being changed - check if new key already exists
          const { data: conflictingRule } = await supabase
            .from('ai_rules')
            .select('id')
            .eq('rule_key', rule_key)
            .neq('id', id)
            .single()

          if (conflictingRule) {
            logger.warn(`Cannot update rule ${id}: rule_key "${rule_key}" already exists`)
            continue
          }
        }

        // Normalize lang: convert to uppercase, remove spaces, handle empty strings
        let normalizedLang: string | null = null
        if (lang !== undefined && lang !== null) {
          if (typeof lang === 'string' && lang.trim()) {
            normalizedLang = lang
              .split(',')
              .map(l => l.trim().toUpperCase())
              .filter(l => l.length > 0)
              .join(',')
            if (normalizedLang === '') {
              normalizedLang = null
            }
          }
        }

        const updateData: any = {
          rule_key, // Allow rule_key to be updated
          instruction,
          scope: scope || 'global',
          scope_reference: scope_reference || null,
          priority: priority || 100,
          version: version || 1,
          is_active: is_active !== undefined ? is_active : true,
          lang: normalizedLang,
          updated_by: user?.id,
        }

        // Handle metadata: allow full metadata object to be set/updated
        // If metadata is explicitly provided (including empty object), use it
        // If metadata is undefined, don't update it (preserve existing)
        if (metadata !== undefined) {
          // If metadata is null or empty object, set to null
          // Otherwise, set to the provided metadata object
          updateData.metadata = (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) 
            ? metadata 
            : null
        }

        const { error } = await supabase
          .from('ai_rules')
          .update(updateData)
          .eq('id', id)

        if (error) {
          logger.warn(`Error updating rule ${rule_key}:`, { error })
        } else if (existingRule && existingRule.rule_key !== rule_key) {
          // Rule key changed - update all associated parameters to use the new rule_key
          const { error: paramUpdateError } = await supabase
            .from('ai_rule_parameters')
            .update({ rule_key })
            .eq('rule_key', existingRule.rule_key)

          if (paramUpdateError) {
            logger.warn(`Error updating parameter rule_keys for rule ${id}:`, { error: paramUpdateError })
          } else {
            logger.info(`Updated parameter rule_keys from "${existingRule.rule_key}" to "${rule_key}" for rule ${id}`)
          }
        }
      }
    }

    // Update or create parameters if provided
    if (parameters && Array.isArray(parameters)) {
      for (const param of parameters) {
        const { id, rule_key, parameter_key, parameter_value } = param

        if (!parameter_key || !rule_key) {
          continue
        }

        if (id && !id.toString().startsWith('new-')) {
          // Update existing parameter
          // Check if rule_key needs to be updated
          const { data: existingParam } = await supabase
            .from('ai_rule_parameters')
            .select('rule_key')
            .eq('id', id)
            .single()

          const updateData: any = {
            parameter_value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          }

          // Update rule_key if it changed
          if (existingParam && existingParam.rule_key !== rule_key) {
            updateData.rule_key = rule_key
          }

          const { error } = await supabase
            .from('ai_rule_parameters')
            .update(updateData)
            .eq('id', id)

          if (error) {
            logger.warn(`Error updating parameter ${parameter_key}:`, { error })
          }
        } else {
          // Create new parameter
          const { error } = await supabase
            .from('ai_rule_parameters')
            .insert({
              rule_key,
              parameter_key,
              parameter_value: parameter_value || '',
              created_by: user?.id,
              updated_by: user?.id,
            })

          if (error) {
            logger.warn(`Error creating parameter ${parameter_key}:`, { error })
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error updating AI settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500)
  }
}

/**
 * POST /api/admin/settings/ai
 * Creates a new AI rule
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const body = await request.json()
  const { rule_key, instruction, scope, scope_reference, priority, version, is_active, lang, metadata } = body

  if (!rule_key || !instruction) {
    throw new ApiError('VALIDATION_ERROR', 'rule_key and instruction are required', 400)
  }

  try {
    // Check if rule_key already exists
    const { data: existingRule } = await supabase
      .from('ai_rules')
      .select('id')
      .eq('rule_key', rule_key)
      .single()

    if (existingRule) {
      throw new ApiError('VALIDATION_ERROR', `Rule with key "${rule_key}" already exists`, 400)
    }

    // Get max priority to set new rule after existing ones
    const { data: maxPriorityRule } = await supabase
      .from('ai_rules')
      .select('priority')
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    const newPriority = maxPriorityRule ? maxPriorityRule.priority + 1 : 100

    // Normalize lang: convert to uppercase, remove spaces, handle empty strings
    let normalizedLang: string | null = null
    if (lang && typeof lang === 'string' && lang.trim()) {
      normalizedLang = lang
        .split(',')
        .map(l => l.trim().toUpperCase())
        .filter(l => l.length > 0)
        .join(',')
      if (normalizedLang === '') {
        normalizedLang = null
      }
    }

    // Handle metadata: allow full metadata object to be set
    // If metadata is null or empty object, set to null
    // Otherwise, set to the provided metadata object
    const normalizedMetadata = (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) 
      ? metadata 
      : null

    const { data: newRule, error } = await supabase
      .from('ai_rules')
      .insert({
        rule_key,
        instruction,
        scope: scope || 'global',
        scope_reference: scope_reference || null,
        priority: priority || newPriority,
        version: version || 1,
        is_active: is_active !== undefined ? is_active : true,
        lang: normalizedLang,
        metadata: normalizedMetadata,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating AI rule:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create rule: ${error.message}`, 500)
    }

    return NextResponse.json({ rule: newRule }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error creating AI rule:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500)
  }
}

/**
 * DELETE /api/admin/settings/ai
 * Deletes an AI rule and its parameters
 */
async function deleteHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const { searchParams } = new URL(request.url)
  const ruleId = searchParams.get('id')
  const ruleKey = searchParams.get('rule_key')

  if (!ruleId && !ruleKey) {
    throw new ApiError('VALIDATION_ERROR', 'Either id or rule_key must be provided', 400)
  }

  try {
    // Get rule_key if we only have id
    let ruleKeyToDelete = ruleKey
    if (!ruleKeyToDelete && ruleId) {
      const { data: ruleData } = await supabase
        .from('ai_rules')
        .select('rule_key')
        .eq('id', ruleId)
        .single()
      
      if (!ruleData) {
        throw new ApiError('NOT_FOUND', 'Rule not found', 404)
      }
      ruleKeyToDelete = ruleData.rule_key
    }
    
    // First delete all parameters for this rule
    if (ruleKeyToDelete) {
      const { error: paramsError } = await supabase
        .from('ai_rule_parameters')
        .delete()
        .eq('rule_key', ruleKeyToDelete)

      if (paramsError) {
        logger.warn('Error deleting rule parameters:', { error: paramsError })
      }
    }

    // Delete the rule
    const { error } = ruleId 
      ? await supabase.from('ai_rules').delete().eq('id', ruleId)
      : await supabase.from('ai_rules').delete().eq('rule_key', ruleKey!)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting AI rule:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to delete rule: ${error.message}`, 500)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error deleting AI rule:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500)
  }
}

export const GET = createGetHandler(getHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const PUT = createPutHandler(putHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const POST = createPostHandler(postHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const DELETE = createDeleteHandler(deleteHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })

