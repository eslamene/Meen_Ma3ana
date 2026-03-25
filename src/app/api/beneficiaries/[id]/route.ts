import { NextRequest, NextResponse } from 'next/server'
import {
  createGetHandlerWithParams,
  createPutHandlerWithParams,
  createDeleteHandlerWithParams,
} from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import type { UpdateBeneficiaryData } from '@/types/beneficiary'
import { mapBeneficiaryRow } from '../beneficiary-map'
import { getBeneficiariesServiceRoleClient } from '../service-role-client'

export const GET = createGetHandlerWithParams(
  async (_request: NextRequest, { user, logger }, params: { id: string }) => {
    const db = getBeneficiariesServiceRoleClient()
    const { data: row, error } = await db.from('beneficiaries').select('*').eq('id', params.id).maybeSingle()

    if (error) {
      logger.error('Error loading beneficiary', error, {
        area: 'beneficiaries',
        operation: 'GET /api/beneficiaries/[id]',
        userId: user.id,
        beneficiaryId: params.id,
      })
      throw createApiError.internalError('Failed to load beneficiary')
    }

    if (!row) {
      throw createApiError.notFound('Beneficiary not found')
    }

    return NextResponse.json({
      success: true,
      data: mapBeneficiaryRow(row as Record<string, unknown>),
    })
  },
  { requireAuth: true, loggerContext: 'api/beneficiaries/[id]' }
)

export const PUT = createPutHandlerWithParams(
  async (request: NextRequest, { user, logger }, params: { id: string }) => {
    const body = (await request.json()) as UpdateBeneficiaryData

    const db = getBeneficiariesServiceRoleClient()

    const { data: existing, error: loadError } = await db
      .from('beneficiaries')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (loadError) {
      logger.error('Error checking beneficiary', loadError, {
        area: 'beneficiaries',
        operation: 'PUT /api/beneficiaries/[id]',
        userId: user.id,
        beneficiaryId: params.id,
      })
      throw createApiError.internalError('Failed to update beneficiary')
    }

    if (!existing) {
      throw createApiError.notFound('Beneficiary not found')
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const optionalKeys = [
      'name',
      'name_ar',
      'age',
      'gender',
      'mobile_number',
      'additional_mobile_number',
      'email',
      'alternative_contact',
      'national_id',
      'id_type',
      'id_type_id',
      'address',
      'city',
      'city_id',
      'governorate',
      'country',
      'medical_condition',
      'social_situation',
      'family_size',
      'dependents',
      'notes',
      'tags',
      'risk_level',
      'is_verified',
      'verification_date',
      'verification_notes',
    ] as const

    for (const key of optionalKeys) {
      if (key in body && body[key as keyof UpdateBeneficiaryData] !== undefined) {
        update[key] = body[key as keyof UpdateBeneficiaryData]
      }
    }

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim()
      if (!trimmed) {
        throw createApiError.validationError('Name cannot be empty')
      }
      update.name = trimmed
    }

    const { data: row, error } = await db
      .from('beneficiaries')
      .update(update)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) {
      logger.error('Error updating beneficiary', error, {
        area: 'beneficiaries',
        operation: 'PUT /api/beneficiaries/[id]',
        userId: user.id,
        beneficiaryId: params.id,
      })
      throw createApiError.internalError('Failed to update beneficiary')
    }

    return NextResponse.json({
      success: true,
      data: mapBeneficiaryRow(row as Record<string, unknown>),
    })
  },
  { requireAuth: true, loggerContext: 'api/beneficiaries/[id]' }
)

export const DELETE = createDeleteHandlerWithParams(
  async (_request: NextRequest, { user, logger }, params: { id: string }) => {
    const db = getBeneficiariesServiceRoleClient()

    const { data: assignedCases, error: casesError } = await db
      .from('cases')
      .select('id, title_en, title_ar')
      .eq('beneficiary_id', params.id)

    if (casesError) {
      logger.error('Error checking beneficiary cases', casesError, {
        area: 'beneficiaries',
        operation: 'DELETE /api/beneficiaries/[id]',
        userId: user.id,
        beneficiaryId: params.id,
      })
      throw createApiError.internalError('Failed to delete beneficiary')
    }

    if (assignedCases && assignedCases.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete beneficiary that is assigned to one or more cases',
          assignedCasesCount: assignedCases.length,
          assignedCases: assignedCases.map((c) => ({
            id: c.id,
            title: c.title_en || c.title_ar || 'Case',
          })),
        },
        { status: 400 }
      )
    }

    const { error: deleteError } = await db.from('beneficiaries').delete().eq('id', params.id)

    if (deleteError) {
      logger.error('Error deleting beneficiary', deleteError, {
        area: 'beneficiaries',
        operation: 'DELETE /api/beneficiaries/[id]',
        userId: user.id,
        beneficiaryId: params.id,
      })
      throw createApiError.internalError('Failed to delete beneficiary')
    }

    return NextResponse.json({ success: true })
  },
  { requireAuth: true, loggerContext: 'api/beneficiaries/[id]' }
)
