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

    // Use StorageBucketService to list buckets and get rules
    const { StorageBucketService } = await import('@/lib/services/storageBucketService')
    
    const buckets = await StorageBucketService.listBuckets()
    const rules = await StorageBucketService.getStorageRules()

    const rulesMap = new Map(
      rules.map(rule => [rule.bucket_name, rule])
    )

    // Map buckets to our format and include rules
    const bucketsWithRules = (buckets ?? []).map(bucket => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      created_at: bucket.created_at ?? new Date().toISOString(),
      updated_at: bucket.updated_at ?? bucket.created_at ?? new Date().toISOString(),
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

