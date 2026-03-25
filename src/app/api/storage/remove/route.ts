import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { env } from '@/config/env'
import { hasPermission } from '@/lib/security/rls'
import { StorageService } from '@/lib/services/storageService'

const MAX_PATHS = 50

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const body = (await request.json()) as { bucket?: string; paths?: string[] }
  const bucket = body.bucket
  const paths = body.paths

  if (!bucket || !Array.isArray(paths) || paths.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'bucket and non-empty paths array are required', 400)
  }

  if (paths.length > MAX_PATHS) {
    throw new ApiError('VALIDATION_ERROR', `At most ${MAX_PATHS} paths per request`, 400)
  }

  const { getBucketForEntity } = await import('@/lib/utils/storageBuckets')
  const beneficiariesBucket = getBucketForEntity('beneficiary')
  if (bucket === beneficiariesBucket) {
    const { adminService } = await import('@/lib/admin/service')
    const hasAdminRole =
      (await adminService.hasRole(context.user.id, 'admin')) ||
      (await adminService.hasRole(context.user.id, 'super_admin'))

    if (!hasAdminRole) {
      logger.warn('Non-admin attempted beneficiary storage remove', { userId: context.user.id })
      throw new ApiError('FORBIDDEN', 'Only administrators can remove beneficiary storage objects', 403)
    }
  } else {
    const allowed = await hasPermission(context.user.id, 'manage:files')
    if (!allowed) {
      logger.warn('Storage remove permission denied', { bucket, userId: context.user.id })
      throw new ApiError('FORBIDDEN', 'Permission denied', 403)
    }
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for storage remove')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    await StorageService.removePaths(serviceSupabase, bucket, paths, logger)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'INVALID_BUCKET') {
      throw new ApiError('VALIDATION_ERROR', 'Invalid bucket name', 400)
    }
    if (msg === 'INVALID_PATH') {
      throw new ApiError('VALIDATION_ERROR', 'Invalid storage path', 400)
    }
    if (msg.startsWith('REMOVE:')) {
      return NextResponse.json({ error: msg.replace(/^REMOVE:/, '') }, { status: 500 })
    }
    throw e
  }

  return NextResponse.json({ success: true })
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/storage/remove',
})
