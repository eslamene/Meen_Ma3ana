/**
 * Storage Buckets API Route
 * GET /api/storage/buckets - List all storage buckets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createStorageAdminClient } from '@/lib/storage/server'
import type { BucketListResponse } from '@/lib/storage/types'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context

  logger.info('Fetching storage buckets', { userId: context.user.id })

    // Create admin client for storage operations
    const supabase = createStorageAdminClient()

    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error listing buckets', { error })
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to fetch buckets: ${error.message}`, 500)
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
}

export const GET = createGetHandler(getHandler, { 
  requirePermissions: ['manage:files'], 
  loggerContext: 'api/storage/buckets' 
})

