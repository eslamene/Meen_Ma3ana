import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createGetHandlerWithParams,
  createPostHandlerWithParams,
  ApiHandlerContext,
} from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseService, type CaseFileBatchInsertInput } from '@/lib/services/caseService'
import { env } from '@/config/env'
import { StorageService } from '@/lib/services/storageService'
import { BUCKET_NAMES } from '@/lib/utils/storageBuckets'

const MAX_FILES_PER_REQUEST = 30

function isCaseFileInsertRow(value: unknown): value is CaseFileBatchInsertInput {
  if (!value || typeof value !== 'object') {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.filename === 'string' &&
    (o.original_filename === null || typeof o.original_filename === 'string') &&
    typeof o.file_url === 'string' &&
    (o.file_path === null || typeof o.file_path === 'string') &&
    typeof o.file_type === 'string' &&
    typeof o.file_size === 'number' &&
    typeof o.category === 'string' &&
    (o.description === null || typeof o.description === 'string') &&
    typeof o.is_public === 'boolean' &&
    typeof o.display_order === 'number'
  )
}

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  let filesData: Awaited<ReturnType<typeof CaseService.listCaseFilesForCase>>
  try {
    filesData = await CaseService.listCaseFilesForCase(supabase, id)
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case files', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch case files', 500)
  }

  // Map database fields to match the CaseFile interface
  const files = (filesData || []).map((file) => ({
    id: file.id,
    filename: file.filename,
    original_filename: file.original_filename,
    file_url: file.file_url,
    file_path: file.file_path,
    file_type: file.file_type,
    file_size: file.file_size,
    category: file.category,
    description: file.description,
    is_public: file.is_public,
    is_primary: file.is_primary,
    display_order: file.display_order,
    created_at: file.created_at,
    uploaded_by: file.uploaded_by
  }))

  return NextResponse.json({ files })
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id: caseId } = params

  const body = (await request.json()) as { files?: unknown }
  const raw = body.files

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'files must be a non-empty array', 400)
  }

  if (raw.length > MAX_FILES_PER_REQUEST) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `At most ${MAX_FILES_PER_REQUEST} files per request`,
      400
    )
  }

  const rows: CaseFileBatchInsertInput[] = []
  for (const item of raw) {
    if (!isCaseFileInsertRow(item)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid file record in files array', 400)
    }
    rows.push(item)
  }

  const caseExists = await CaseService.caseExists(supabase, caseId)
  if (!caseExists) {
    throw new ApiError('NOT_FOUND', 'Case not found', 404)
  }

  try {
    const inserted = await CaseService.insertCaseFilesBatch(supabase, caseId, rows)
    return NextResponse.json({ files: inserted })
  } catch (e) {
    const err = e as Error & { code?: string }
    const code = err.code
    const msg = err.message || ''
    if (
      code === '23505' ||
      code === 'PGRST409' ||
      msg.includes('409') ||
      msg.toLowerCase().includes('duplicate') ||
      msg.toLowerCase().includes('conflict')
    ) {
      logger.warn('Case files batch insert conflict', { caseId, code, message: msg })
      if (env.SUPABASE_SERVICE_ROLE_KEY) {
        const paths = rows.map((r) => r.file_path).filter((p): p is string => !!p)
        if (paths.length > 0) {
          try {
            const serviceSupabase = createClient(
              env.NEXT_PUBLIC_SUPABASE_URL,
              env.SUPABASE_SERVICE_ROLE_KEY
            )
            await StorageService.removePaths(serviceSupabase, BUCKET_NAMES.CASE_FILES, paths, logger)
          } catch (cleanupErr) {
            logger.warn('Failed to cleanup storage after insert conflict', { error: cleanupErr })
          }
        }
      }
      throw new ApiError('CONFLICT', 'Could not save files (conflict or duplicate).', 409)
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Case files batch insert failed', {
      error: e,
      caseId,
    })
    throw new ApiError('INTERNAL_SERVER_ERROR', msg || 'Failed to save files', 500)
  }
}

export const GET = createGetHandlerWithParams(getHandler, {
  requireAuth: false, // Public endpoint
  loggerContext: 'api/cases/[id]/files',
})

export const POST = createPostHandlerWithParams(postHandler, {
  requireAuth: true,
  loggerContext: 'api/cases/[id]/files',
})

