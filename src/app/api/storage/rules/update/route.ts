/**
 * Storage Rules Update API Route
 * POST /api/storage/rules/update - Create or update storage rules for a bucket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createStorageAdminClient } from '@/lib/storage/server'
import type { StorageRuleUpdate, StorageRuleResponse } from '@/lib/storage/types'

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context
  const body: StorageRuleUpdate = await request.json()
  const { bucket_name, max_file_size_mb, allowed_extensions } = body

  // Validate input
  if (!bucket_name || typeof bucket_name !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'bucket_name is required and must be a string', 400)
  }

  if (typeof max_file_size_mb !== 'number' || max_file_size_mb <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'max_file_size_mb must be a positive number', 400)
  }

  if (!Array.isArray(allowed_extensions) || allowed_extensions.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'allowed_extensions must be a non-empty array', 400)
  }

  // Validate extensions are strings
  if (!allowed_extensions.every(ext => typeof ext === 'string')) {
    throw new ApiError('VALIDATION_ERROR', 'All allowed_extensions must be strings', 400)
  }

  logger.info('Updating storage rules', {
    userId: context.user.id,
    bucket_name,
    max_file_size_mb,
    allowed_extensions
  })

    // Create admin client
    const supabase = createStorageAdminClient()

    // Verify bucket exists
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucket_name)

    if (bucketError) {
      logger.warn('Bucket not found', { bucket_name, error: bucketError.message })
      throw new ApiError('NOT_FOUND', `Bucket not found: ${bucketError.message}`, 404)
    }

    // Normalize extensions: lowercase, trim whitespace, remove duplicates
    const normalizedExtensions = Array.from(
      new Set(
        allowed_extensions
          .map(ext => ext.toLowerCase().trim())
          .filter(ext => ext.length > 0)
      )
    )

    // Upsert storage rule
    const { data: rule, error: upsertError } = await supabase
      .from('storage_rules')
      .upsert(
        {
          bucket_name,
          max_file_size_mb,
          allowed_extensions: normalizedExtensions
        },
        {
          onConflict: 'bucket_name'
        }
      )
      .select()
      .single()

    if (upsertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error upserting storage rule', { error: upsertError })
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update storage rule: ${upsertError.message}`, 500)
    }

    const response: StorageRuleResponse = {
      rule
    }

    logger.info('Successfully updated storage rules', { bucket_name, ruleId: rule.id })

    return NextResponse.json(response)
}

export const POST = createPostHandler(postHandler, { 
  requirePermissions: ['manage:files'], 
  loggerContext: 'api/storage/rules/update' 
})

