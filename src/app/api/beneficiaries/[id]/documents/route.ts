import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
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
    .eq('beneficiary_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary documents', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch documents', 500)
  }

  return NextResponse.json({ documents: data || [] })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/beneficiaries/[id]/documents' 
})

