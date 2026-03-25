import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler } from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import type { CreateBeneficiaryData } from '@/types/beneficiary'
import { mapBeneficiaryRow } from './beneficiary-map'
import { getBeneficiariesServiceRoleClient } from './service-role-client'

export const GET = createGetHandler(
  async (request: NextRequest, { user, logger }) => {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(1000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50))
    const offset = (page - 1) * limit

    const db = getBeneficiariesServiceRoleClient()
    const { data: rows, error } = await db
      .from('beneficiaries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('Error listing beneficiaries', error, {
        area: 'beneficiaries',
        operation: 'GET /api/beneficiaries',
        userId: user.id,
      })
      throw createApiError.internalError('Failed to load beneficiaries')
    }

    const data = (rows || []).map((r) => mapBeneficiaryRow(r as Record<string, unknown>))
    return NextResponse.json({ success: true, data })
  },
  { requireAuth: true, loggerContext: 'api/beneficiaries' }
)

export const POST = createPostHandler(
  async (request: NextRequest, { user, logger }) => {
    const body = (await request.json()) as CreateBeneficiaryData
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      throw createApiError.validationError('Name is required')
    }

    const insert: Record<string, unknown> = {
      name,
      created_by: user.id,
      country: body.country ?? 'Egypt',
      id_type: body.id_type ?? 'national_id',
      risk_level: body.risk_level ?? 'low',
      is_verified: false,
    }

    const optionalKeys = [
      'name_ar',
      'age',
      'gender',
      'mobile_number',
      'additional_mobile_number',
      'email',
      'alternative_contact',
      'national_id',
      'id_type_id',
      'address',
      'city',
      'city_id',
      'governorate',
      'medical_condition',
      'social_situation',
      'family_size',
      'dependents',
      'notes',
      'tags',
    ] as const

    for (const key of optionalKeys) {
      const v = body[key as keyof CreateBeneficiaryData]
      if (v !== undefined && v !== null && v !== '') {
        insert[key] = v
      }
    }

    const db = getBeneficiariesServiceRoleClient()
    const { data: row, error } = await db.from('beneficiaries').insert(insert).select('*').single()

    if (error) {
      logger.error('Error creating beneficiary', error, {
        area: 'beneficiaries',
        operation: 'POST /api/beneficiaries',
        userId: user.id,
      })
      throw createApiError.internalError('Failed to create beneficiary')
    }

    return NextResponse.json(
      {
        success: true,
        data: mapBeneficiaryRow(row as Record<string, unknown>),
      },
      { status: 201 }
    )
  },
  { requireAuth: true, loggerContext: 'api/beneficiaries' }
)
