import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { BeneficiaryDocumentsServerService } from '@/lib/services/beneficiaryDocumentsServerService'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()

    const insertData = {
      ...body,
      uploaded_by: user.id
    }

    let document: Record<string, unknown>
    try {
      document = await BeneficiaryDocumentsServerService.create(supabase, insertData)
    } catch (e) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary document:', e)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create document', 500)
    }

    return NextResponse.json({ document }, { status: 201 })
}

export const POST = createPostHandler(handler, { requireAuth: true, loggerContext: 'api/beneficiaries/documents' })
