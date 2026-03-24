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
    const { AIRuleService } = await import('@/lib/services/aiRuleService')
    
    const rules = await AIRuleService.getAllRules(supabase)
    const parameters = await AIRuleService.getAllParameters(supabase)

    return NextResponse.json({
      rules,
      parameters,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error fetching AI settings:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred', 500)
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
    const { AIRuleService } = await import('@/lib/services/aiRuleService')

    // Update rules if provided
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        const { id, rule_key, instruction, scope, scope_reference, priority, version, is_active, lang, metadata } = rule

        if (!id || !rule_key) {
          continue
        }

        try {
          await AIRuleService.updateRule(supabase, id, {
            rule_key,
            instruction,
            scope,
            scope_reference,
            priority,
            version,
            is_active,
            lang,
            metadata
          }, user?.id || '')
        } catch (error) {
          logger.warn(`Error updating rule ${rule_key}:`, { error })
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

        try {
          if (id && !id.toString().startsWith('new-')) {
            // Update existing parameter
            await AIRuleService.updateParameter(supabase, id, {
              rule_key,
              parameter_value
            }, user?.id || '')
          } else {
            // Create new parameter
            await AIRuleService.createParameter(supabase, {
              rule_key,
              parameter_key,
              parameter_value: parameter_value || ''
            }, user?.id || '')
          }
        } catch (error) {
          logger.warn(`Error updating/creating parameter ${parameter_key}:`, { error })
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
    const { AIRuleService } = await import('@/lib/services/aiRuleService')
    
    const newRule = await AIRuleService.createRule(supabase, {
      rule_key,
      instruction,
      scope,
      scope_reference,
      priority,
      version,
      is_active,
      lang,
      metadata
    }, user?.id || '')

    return NextResponse.json({ rule: newRule }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ApiError('VALIDATION_ERROR', error.message, 400)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error creating AI rule:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred', 500)
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
    const { AIRuleService } = await import('@/lib/services/aiRuleService')
    
    if (ruleId) {
      await AIRuleService.deleteRule(supabase, ruleId)
    } else if (ruleKey) {
      await AIRuleService.deleteRuleByKey(supabase, ruleKey)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error && error.message.includes('not found')) {
      throw new ApiError('NOT_FOUND', error.message, 404)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Unexpected error deleting AI rule:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred', 500)
  }
}

export const GET = createGetHandler(getHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const PUT = createPutHandler(putHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const POST = createPostHandler(postHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })
export const DELETE = createDeleteHandler(deleteHandler, { requireAdmin: true, loggerContext: 'api/admin/settings/ai' })

