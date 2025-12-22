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

    // Create admin client
    const supabase = createStorageAdminClient()

    // Get storage rules FIRST (this is what the uploader needs, and it's fast)
    const { data: rule } = await supabase
      .from('storage_rules')
      .select('*')
      .eq('bucket_name', bucketName)
      .maybeSingle()

    // Get bucket metadata
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName)

    if (bucketError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching bucket', { error: bucketError })
      throw new ApiError('NOT_FOUND', `Bucket not found: ${bucketError.message}`, 404)
    }

    // Get object count ONLY if requested (this is slow, so skip for file uploader)
    let objectCount: number | undefined
    if (includeCount) {
      try {
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
        created_at: bucket.created_at,
        updated_at: bucket.updated_at,
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

