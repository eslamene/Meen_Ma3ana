import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createPatchHandlerWithParams,
  createDeleteHandlerWithParams,
  ApiHandlerContext,
} from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseService } from '@/lib/services/caseService'
import { env } from '@/config/env'
import { StorageService } from '@/lib/services/storageService'
import { BUCKET_NAMES } from '@/lib/utils/storageBuckets'

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string; fileId: string }
) {
  const { supabase, logger } = context
  const { id: caseId, fileId } = params

    const body = await request.json()
    const { originalName, description, category, isPublic } = body

    logger.info('Update file request', { caseId, fileId, originalName, description, category, isPublic })

    const cleanFileId = fileId.replace('case-image-', '')
    logger.info('Updating case_files with ID', { cleanFileId })

    let existingFile: Record<string, unknown> | null
    try {
      existingFile = await CaseService.getCaseFileForCase(supabase, caseId, cleanFileId)
    } catch {
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to verify file', 500)
    }

    if (!existingFile) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'File not found', { cleanFileId, caseId })
      throw new ApiError('NOT_FOUND', 'File does not exist or does not belong to this case', 404)
    }

    const updateData: Record<string, string | boolean> = {}

    if (originalName !== undefined) {
      updateData.filename = originalName
      updateData.original_filename = originalName
    }

    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (isPublic !== undefined) updateData.is_public = isPublic

    logger.info('Update data:', updateData)

    if (Object.keys(updateData).length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Request body must contain at least one field to update', 400)
    }

    let updatedFile: Record<string, unknown>
    try {
      updatedFile = await CaseService.updateCaseFileRecord(supabase, caseId, cleanFileId, updateData)
    } catch (e) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating file', { error: e })
      throw new ApiError(
        'INTERNAL_SERVER_ERROR',
        e instanceof Error ? e.message : 'Failed to update file',
        500
      )
    }

    logger.info('File updated successfully', { updatedFile })
    return NextResponse.json({ success: true, file: updatedFile })
}

async function deleteHandler(
  _request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string; fileId: string }
) {
  const { supabase, logger } = context
  const { id: caseId, fileId } = params

  let deleted: { file_path: string | null } | null
  try {
    deleted = await CaseService.deleteCaseFileForCase(supabase, caseId, fileId)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting case file', { error: e })
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      e instanceof Error ? e.message : 'Failed to delete file',
      500
    )
  }

  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'File does not exist or does not belong to this case', 404)
  }

  const path = deleted.file_path
  if (path && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const serviceSupabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      )
      await StorageService.removePaths(serviceSupabase, BUCKET_NAMES.CASE_FILES, [path], logger)
    } catch (e) {
      logger.warn('Storage remove after case file delete failed', { error: e, path })
    }
  }

  return NextResponse.json({ success: true })
}

export const PATCH = createPatchHandlerWithParams(patchHandler, {
  requireAuth: true,
  loggerContext: 'api/cases/[id]/files/[fileId]',
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, {
  requireAuth: true,
  loggerContext: 'api/cases/[id]/files/[fileId]',
})

