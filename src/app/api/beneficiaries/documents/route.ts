import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()
    
    const insertData = {
      ...body,
      uploaded_by: user.id
    }

    const { data: document, error } = await supabase
      .from('beneficiary_documents')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary document:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create document', 500)
    }

    return NextResponse.json({ document }, { status: 201 })
}

export const POST = createPostHandler(handler, { requireAuth: true, loggerContext: 'api/beneficiaries/documents' })

