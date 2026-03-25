import { NextRequest, NextResponse } from 'next/server'
import {
  createGetHandlerWithParams,
  createPostHandlerWithParams,
  ApiHandlerContext,
} from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { BeneficiaryDocumentsServerService } from '@/lib/services/beneficiaryDocumentsServerService'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  let data: Record<string, unknown>[]
  try {
    data = await BeneficiaryDocumentsServerService.listByBeneficiaryId(supabase, id)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary documents', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch documents', 500)
  }

  return NextResponse.json({ documents: data || [] })
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id: beneficiaryId } = params
  const body = await request.json()

  let document: Record<string, unknown>
  try {
    document = await BeneficiaryDocumentsServerService.create(supabase, {
      ...body,
      beneficiary_id: beneficiaryId,
      uploaded_by: user.id,
    })
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary document', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create document', 500)
  }

  return NextResponse.json({ document }, { status: 201 })
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: true,
  loggerContext: 'api/beneficiaries/[id]/documents',
})

export const POST = createPostHandlerWithParams(postHandler, {
  requireAuth: true,
  loggerContext: 'api/beneficiaries/[id]/documents',
})

