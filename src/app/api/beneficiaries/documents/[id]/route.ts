import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  const { data, error } = await supabase
    .from('beneficiary_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError('NOT_FOUND', 'Document not found', 404)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary document', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch document', 500)
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

  const { data: document, error } = await supabase
    .from('beneficiary_documents')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating beneficiary document', { error })
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

  const { error } = await supabase
    .from('beneficiary_documents')
    .delete()
    .eq('id', id)

  if (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary document', { error })
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

