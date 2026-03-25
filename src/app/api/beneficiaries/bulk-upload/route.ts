import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import * as XLSX from 'xlsx'
import {
  BeneficiaryBulkUploadService,
  type ExcelRow,
  type UploadResult,
} from '@/lib/services/beneficiaryBulkUploadService'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger, user } = context

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for beneficiary operations')
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

    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'No file provided', 400)
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file',
        400
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      raw: false,
      defval: null,
    })

    if (rows.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Excel file is empty', 400)
    }

    logger.info(`Processing ${rows.length} rows from Excel file`)

    const result = await BeneficiaryBulkUploadService.execute(
      serviceRoleClient,
      rows,
      user.id,
      logger
    )

    if (!result.success) {
      return NextResponse.json(result as UploadResult, { status: 400 })
    }

    logger.info(`Bulk upload completed: ${result.created} created, ${result.skipped} skipped`)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error in bulk upload:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred during bulk upload', 500)
  }
}

export const POST = createPostHandler(postHandler, {
  loggerContext: 'api/beneficiaries/bulk-upload',
  requireAuth: true,
})
