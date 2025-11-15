/**
 * Storage Bucket Details API Route
 * GET /api/storage/buckets/[name] - Get bucket details and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { createStorageAdminClient } from '@/lib/storage/server'
import { requirePermission } from '@/lib/security/guards'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import type { BucketDetailsResponse } from '@/lib/storage/types'
import type { RouteContext } from '@/types/next-api'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ name: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check permission
    const guardResult = await requirePermission('manage:files')(request)

    if (guardResult instanceof NextResponse) {
      logger.warn('Unauthorized access to bucket details', { status: guardResult.status })
      return guardResult
    }

    const params = await context.params
    const bucketName = decodeURIComponent(params.name)
    
    // Check if we need object count (only for admin details page, not for file uploader)
    const url = new URL(request.url)
    const includeCount = url.searchParams.get('includeCount') === 'true'

    logger.info('Fetching bucket details', { userId: guardResult.user.id, bucketName, includeCount })

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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching bucket:', bucketError)
      return NextResponse.json(
        { error: 'Bucket not found', details: bucketError.message },
        { status: 404 }
      )
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in bucket details API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

