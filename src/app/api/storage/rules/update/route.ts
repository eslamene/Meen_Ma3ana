/**
 * Storage Rules Update API Route
 * POST /api/storage/rules/update - Create or update storage rules for a bucket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createStorageAdminClient } from '@/lib/storage/server'
import { requirePermission } from '@/lib/security/guards'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import type { StorageRuleUpdate, StorageRuleResponse } from '@/lib/storage/types'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check permission - require manage:files or admin role
    const guardResult = await requirePermission('manage:files')(request)

    if (guardResult instanceof NextResponse) {
      logger.warn('Unauthorized access to storage rules update', { status: guardResult.status })
      return guardResult
    }

    const body: StorageRuleUpdate = await request.json()
    const { bucket_name, max_file_size_mb, allowed_extensions } = body

    // Validate input
    if (!bucket_name || typeof bucket_name !== 'string') {
      return NextResponse.json(
        { error: 'bucket_name is required and must be a string' },
        { status: 400 }
      )
    }

    if (typeof max_file_size_mb !== 'number' || max_file_size_mb <= 0) {
      return NextResponse.json(
        { error: 'max_file_size_mb must be a positive number' },
        { status: 400 }
      )
    }

    if (!Array.isArray(allowed_extensions) || allowed_extensions.length === 0) {
      return NextResponse.json(
        { error: 'allowed_extensions must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate extensions are strings
    if (!allowed_extensions.every(ext => typeof ext === 'string')) {
      return NextResponse.json(
        { error: 'All allowed_extensions must be strings' },
        { status: 400 }
      )
    }

    logger.info('Updating storage rules', {
      userId: guardResult.user.id,
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
      return NextResponse.json(
        { error: 'Bucket not found', details: bucketError.message },
        { status: 404 }
      )
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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error upserting storage rule:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update storage rule', details: upsertError.message },
        { status: 500 }
      )
    }

    const response: StorageRuleResponse = {
      rule
    }

    logger.info('Successfully updated storage rules', { bucket_name, ruleId: rule.id })

    return NextResponse.json(response)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in storage rules update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

