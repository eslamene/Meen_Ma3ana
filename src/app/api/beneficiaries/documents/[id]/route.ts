import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { BeneficiaryDocumentsServerService } from '@/lib/services/beneficiaryDocumentsServerService'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  let data: Record<string, unknown> | null
  try {
    data = await BeneficiaryDocumentsServerService.getById(supabase, id)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary document', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch document', 500)
  }

  if (!data) {
    throw new ApiError('NOT_FOUND', 'Document not found', 404)
  }

  return NextResponse.json({ document: data })
}

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params
  const body = await request.json()

  let document: Record<string, unknown>
  try {
    document = await BeneficiaryDocumentsServerService.update(supabase, id, body)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating beneficiary document', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update document', 500)
  }

  return NextResponse.json({ document })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  try {
    await BeneficiaryDocumentsServerService.delete(supabase, id)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary document', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete document', 500)
  }

  return NextResponse.json({ message: 'Document deleted successfully' })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/beneficiaries/documents/[id]' 
})

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAuth: true, 
  loggerContext: 'api/beneficiaries/documents/[id]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAuth: true, 
  loggerContext: 'api/beneficiaries/documents/[id]' 
})

