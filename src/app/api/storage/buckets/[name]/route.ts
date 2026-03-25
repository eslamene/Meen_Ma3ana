/**
 * Storage Bucket Details API Route
 * GET /api/storage/buckets/[name] - Get bucket details and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createStorageAdminClient } from '@/lib/storage/server'
import type { BucketDetailsResponse } from '@/lib/storage/types'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { name: string }
) {
  const { logger } = context
  const bucketName = decodeURIComponent(params.name)
  
  // Check if we need object count (only for admin details page, not for file uploader)
  const url = new URL(request.url)
  const includeCount = url.searchParams.get('includeCount') === 'true'

  logger.info('Fetching bucket details', { userId: context.user.id, bucketName, includeCount })

    // Use StorageBucketService to get bucket and rules
    const { StorageBucketService } = await import('@/lib/services/storageBucketService')
    const { createStorageAdminClient } = await import('@/lib/storage/server')
    
    // Get storage rules FIRST (this is what the uploader needs, and it's fast)
    const rule = await StorageBucketService.getStorageRule(bucketName)

    // Get bucket metadata
    const bucket = await StorageBucketService.getBucket(bucketName)

    if (!bucket) {
      throw new ApiError('NOT_FOUND', `Bucket not found: ${bucketName}`, 404)
    }

    // Get object count ONLY if requested (this is slow, so skip for file uploader)
    let objectCount: number | undefined
    if (includeCount) {
      try {
        // Use storage admin client for listing files (storage operation, not database query)
        const supabase = createStorageAdminClient()
        const { data: files } = await supabase.storage
          .from(bucketName)
          .list('', {
            limit: 10000,
            offset: 0
          })
        // Note: This is an approximation. For exact count, you'd need to paginate through all files
        objectCount = files?.length
      } catch (error) {
        // If counting fails, just omit the count
        logger.debug('Could not count objects in bucket', { bucketName })
      }
    }

    const response: BucketDetailsResponse = {
      bucket: {
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        created_at: bucket.created_at ?? new Date().toISOString(),
        updated_at: bucket.updated_at ?? bucket.created_at ?? new Date().toISOString(),
        file_size_limit: rule?.max_file_size_mb,
        allowed_mime_types: rule?.allowed_extensions,
        object_count: objectCount
      },
      rule: rule ?? undefined
    }

    logger.info('Successfully fetched bucket details', { bucketName })

    return NextResponse.json(response)
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requirePermissions: ['manage:files'], 
  loggerContext: 'api/storage/buckets/[name]' 
})

