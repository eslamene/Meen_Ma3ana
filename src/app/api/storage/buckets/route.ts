/**
 * Storage Buckets API Route
 * GET /api/storage/buckets - List all storage buckets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createStorageAdminClient } from '@/lib/storage/server'
import { requirePermission } from '@/lib/security/guards'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import type { BucketListResponse } from '@/lib/storage/types'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check permission - require manage:files or admin role
    const guardResult = await requirePermission('manage:files')(request)

    if (guardResult instanceof NextResponse) {
      logger.warn('Unauthorized access to storage buckets', { status: guardResult.status })
      return guardResult
    }

    logger.info('Fetching storage buckets', { userId: guardResult.user.id })

    // Create admin client for storage operations
    const supabase = createStorageAdminClient()

    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error listing buckets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch buckets', details: error.message },
        { status: 500 }
      )
    }

    // Fetch storage rules for each bucket to include in response
    const { data: rules } = await supabase
      .from('storage_rules')
      .select('*')

    const rulesMap = new Map(
      rules?.map(rule => [rule.bucket_name, rule]) ?? []
    )

    // Map buckets to our format and include rules
    const bucketsWithRules = (buckets ?? []).map(bucket => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      created_at: bucket.created_at,
      updated_at: bucket.updated_at,
      file_size_limit: rulesMap.get(bucket.name)?.max_file_size_mb,
      allowed_mime_types: rulesMap.get(bucket.name)?.allowed_extensions
    }))

    const response: BucketListResponse = {
      buckets: bucketsWithRules
    }

    logger.info('Successfully fetched buckets', { count: bucketsWithRules.length })

    return NextResponse.json(response)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in storage buckets API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

