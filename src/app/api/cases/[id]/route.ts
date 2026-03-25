import { NextRequest, NextResponse } from 'next/server'
import {
  createGetHandlerWithParams,
  createPatchHandlerWithParams,
} from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import { CaseService, type UpdateCaseData } from '@/lib/services/caseService'

function patchBodyToUpdateCaseData(body: Record<string, unknown>): UpdateCaseData {
  const u: UpdateCaseData = {}

  const str = (v: unknown) => (v === null || v === undefined ? undefined : String(v))
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  if ('title_en' in body) u.title_en = str(body.title_en)
  if ('title_ar' in body) u.title_ar = str(body.title_ar)
  if ('description_en' in body) u.description_en = str(body.description_en)
  if ('description_ar' in body) u.description_ar = str(body.description_ar)
  if ('status' in body) u.status = str(body.status)
  if ('priority' in body) u.priority = str(body.priority)
  if ('location' in body) u.location = str(body.location)
  if ('type' in body) u.type = str(body.type)
  if ('category_id' in body) {
    u.category_id = body.category_id === null || body.category_id === '' ? null : String(body.category_id)
  }

  if ('target_amount' in body) {
    const t = num(body.target_amount)
    if (t !== undefined) u.target_amount = t
  }
  if ('targetAmount' in body) {
    const t = num(body.targetAmount)
    if (t !== undefined) u.target_amount = t
  }

  if ('beneficiary_name' in body) u.beneficiary_name = str(body.beneficiary_name)
  if ('beneficiaryName' in body) u.beneficiary_name = str(body.beneficiaryName)

  if ('beneficiary_contact' in body) u.beneficiary_contact = str(body.beneficiary_contact)
  if ('beneficiaryContact' in body) u.beneficiary_contact = str(body.beneficiaryContact)

  if ('duration' in body) {
    const d = num(body.duration)
    u.duration = d === undefined ? undefined : d
  }
  if ('frequency' in body) u.frequency = str(body.frequency)
  if ('start_date' in body) u.start_date = str(body.start_date)
  if ('end_date' in body) u.end_date = str(body.end_date)
  if ('assigned_to' in body) u.assigned_to = str(body.assigned_to)
  if ('sponsored_by' in body) u.sponsored_by = str(body.sponsored_by)

  return u
}

export const GET = createGetHandlerWithParams(
  async (_request: NextRequest, { supabase, logger }, params: { id: string }) => {
    const caseRow = await CaseService.getById(supabase, params.id)
    if (!caseRow) {
      throw createApiError.notFound('Case not found')
    }

    let detectionRules: string[] = []
    if (caseRow.category_id) {
      const { data: rules, error: rulesError } = await supabase
        .from('category_detection_rules')
        .select('keyword')
        .eq('category_id', caseRow.category_id)
        .eq('is_active', true)

      if (rulesError) {
        logger.warn('Could not load category detection rules', { error: rulesError, categoryId: caseRow.category_id })
      } else {
        detectionRules = (rules || []).map((r) => r.keyword).filter(Boolean)
      }
    }

    return NextResponse.json({
      case: {
        ...caseRow,
        detectionRules,
      },
    })
  },
  { requireAuth: false, loggerContext: 'api/cases/[id]' }
)

export const PATCH = createPatchHandlerWithParams(
  async (request: NextRequest, { supabase, logger, user }, params: { id: string }) => {
    const existing = await CaseService.getById(supabase, params.id)
    if (!existing) {
      throw createApiError.notFound('Case not found')
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      throw createApiError.badRequest('Invalid JSON body')
    }

    const updatePayload = patchBodyToUpdateCaseData(body)

    try {
      const updated = await CaseService.update(supabase, params.id, updatePayload)
      logger.info('Case updated', { caseId: params.id, userId: user.id })
      return NextResponse.json({
        success: true,
        case: updated,
      })
    } catch (e) {
      logger.error('Case PATCH failed', e instanceof Error ? e : new Error(String(e)), {
        caseId: params.id,
        userId: user.id,
      })
      throw createApiError.internalError(e instanceof Error ? e.message : 'Failed to update case')
    }
  },
  { requireAuth: true, loggerContext: 'api/cases/[id]' }
)
