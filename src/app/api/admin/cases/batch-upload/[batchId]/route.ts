import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import {
  createGetHandlerWithParams,
  createPostHandlerWithParams,
  createDeleteHandlerWithParams,
  ApiHandlerContext,
} from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import {
  BatchCaseUploadService,
  type NicknameMapping,
} from '@/lib/services/batchCaseUploadService'

function serviceRoleClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * GET /api/admin/cases/batch-upload/[batchId]
 */
async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { logger } = context
  const { batchId } = params

  try {
    const client = serviceRoleClient()
    const data = await BatchCaseUploadService.getBatchDetail(client, batchId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
    }
    logger.error('Unexpected error in getHandler:', { error, batchId })
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      error instanceof Error ? error.message : 'Failed to load batch',
      500
    )
  }
}

async function mapNicknamesHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string },
  body?: { mappings?: NicknameMapping[] }
) {
  const { batchId } = params
  const requestBody = body ?? (await request.json())
  const mappings: NicknameMapping[] = requestBody.mappings || []

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Mappings array is required', 400)
  }

  try {
    const client = serviceRoleClient()
    const result = await BatchCaseUploadService.applyNicknameMappings(client, batchId, mappings)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'BATCH_NOT_FOUND') {
      throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
    }
    if (msg === 'BATCH_NOT_PENDING') {
      throw new ApiError('VALIDATION_ERROR', 'Can only map nicknames for pending batches', 400)
    }
    throw error
  }
}

async function processHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { logger, user } = context
  const { batchId } = params

  try {
    const client = serviceRoleClient()
    const result = await BatchCaseUploadService.processBatch(client, batchId, user.id, logger)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'BATCH_NOT_FOUND') {
      throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
    }
    if (msg === 'ALREADY_PROCESSING') {
      throw new ApiError('VALIDATION_ERROR', 'Batch is already being processed', 400)
    }
    if (msg === 'ALREADY_COMPLETED') {
      throw new ApiError('VALIDATION_ERROR', 'Batch has already been processed', 400)
    }
    if (msg === 'NO_ITEMS') {
      throw new ApiError('VALIDATION_ERROR', 'No items found in batch', 400)
    }
    if (msg.startsWith('UNMAPPED:')) {
      const n = msg.split(':')[1]
      throw new ApiError(
        'VALIDATION_ERROR',
        `Cannot process batch: ${n} item(s) are not mapped. Please map all contributors before processing.`,
        400
      )
    }
    if (msg === 'NO_CASH_PAYMENT_METHOD') {
      throw new ApiError('CONFIGURATION_ERROR', 'Default payment method (cash) not found', 500)
    }
    throw error
  }
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload'],
})

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const body = await request.json()
  const { action } = body

  if (action === 'map-nicknames') {
    return mapNicknamesHandler(request, context, params, body)
  }
  if (action === 'process') {
    return processHandler(request, context, params)
  }
  throw new ApiError('VALIDATION_ERROR', 'Invalid action. Use action: "map-nicknames" or "process"', 400)
}

export const POST = createPostHandlerWithParams(postHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload'],
})

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { logger } = context
  const { batchId } = params

  try {
    logger.info(`Deleting batch upload: ${batchId}`)
    const client = serviceRoleClient()
    const deleted = await BatchCaseUploadService.deleteBatchCascade(client, batchId, logger)

    return NextResponse.json({
      success: true,
      message: `Batch upload deleted successfully. Removed ${deleted.cases} cases and ${deleted.contributions} contributions.`,
      deleted: {
        cases: deleted.cases,
        contributions: deleted.contributions,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'NOT_FOUND') {
      throw new ApiError('NOT_FOUND', `Batch upload with ID ${batchId} not found`, 404)
    }
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error deleting batch:', error)
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred during batch deletion',
      500
    )
  }
}

export const DELETE = createDeleteHandlerWithParams(deleteHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload'],
})
