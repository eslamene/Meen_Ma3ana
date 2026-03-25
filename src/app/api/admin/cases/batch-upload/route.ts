import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { ApiHandlerContext, createPostHandler, createGetHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { BatchCaseUploadService } from '@/lib/services/batchCaseUploadService'

/**
 * POST /api/admin/cases/batch-upload
 * Upload CSV file and create batch upload record with items
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger, user } = context

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch upload operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceRoleClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const batchName = (formData.get('name') as string) || `Batch Upload - ${new Date().toLocaleString()}`

    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'No file provided', 400)
    }

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    if (!validTypes.includes(file.type) && !file.name.match(/\.csv$/i)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid file type. Please upload a CSV file', 400)
    }

    const arrayBuffer = await file.arrayBuffer()

    let rows
    try {
      rows = await BatchCaseUploadService.parseUploadFile(file, arrayBuffer)
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      if (code === 'CSV_FILE_TOO_SHORT') {
        throw new ApiError(
          'VALIDATION_ERROR',
          'CSV file must have at least a header and one data row',
          400
        )
      }
      if (code === 'CSV_MISSING_COLUMNS') {
        throw new ApiError(
          'VALIDATION_ERROR',
          'CSV must contain columns: CaseNumber, CaseTitle, ContributorNickname, Amount, Month',
          400
        )
      }
      throw e
    }

    const result = await BatchCaseUploadService.createUploadFromRows(serviceRoleClient, {
      createdBy: user.id,
      batchName,
      sourceFileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      rows,
    })

    logger.info(`Batch upload created: ${result.batch_id} with ${result.total_items} items`)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'NO_VALID_ROWS') {
      throw new ApiError('VALIDATION_ERROR', 'No valid rows found in file', 400)
    }
    if (msg === 'NO_VALID_ITEMS') {
      throw new ApiError('VALIDATION_ERROR', 'No valid items found in file', 400)
    }
    logger.error('Unexpected error in batch upload:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred during batch upload', 500)
  }
}

/**
 * GET /api/admin/cases/batch-upload
 * List batch uploads
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    const { data, total } = await BatchCaseUploadService.listUploads(supabase, {
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data,
      total,
    })
  } catch (error) {
    logger.error('Error fetching batch uploads:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch batch uploads', 500)
  }
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload'],
})
export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload'],
})
