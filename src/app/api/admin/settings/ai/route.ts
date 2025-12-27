import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPutHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
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
        const { id, rule_key, instruction, scope, scope_reference, priority, version, is_active, metadata } = rule

        if (!id || !rule_key) {
          continue
        }

        const updateData: any = {
          instruction,
          scope: scope || 'global',
          scope_reference: scope_reference || null,
          priority: priority || 100,
          version: version || 1,
          is_active: is_active !== undefined ? is_active : true,
          metadata: metadata || null,
          updated_by: user?.id,
        }

        const { error } = await supabase
          .from('ai_rules')
          .update(updateData)
          .eq('id', id)

        if (error) {
          logger.warn(`Error updating rule ${rule_key}:`, { error })
        }
      }
    }

    // Update parameters if provided
    if (parameters && Array.isArray(parameters)) {
      for (const param of parameters) {
        const { id, parameter_key, parameter_value } = param

        if (!id || !parameter_key) {
          continue
        }

        const { error } = await supabase
          .from('ai_rule_parameters')
          .update({ 
            parameter_value, 
            updated_at: new Date().toISOString(),
            updated_by: user?.id 
          })
          .eq('id', id)

        if (error) {
          logger.warn(`Error updating parameter ${parameter_key}:`, { error })
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

export const GET = createGetHandler(getHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const PUT = createPutHandler(putHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })

