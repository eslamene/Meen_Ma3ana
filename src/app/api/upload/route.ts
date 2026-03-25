import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { env } from '@/config/env'
import { hasPermission } from '@/lib/security/rls'
import { StorageService } from '@/lib/services/storageService'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: authenticatedUser, logger } = context

  const formData = await request.formData()
  const bucket = formData.get('bucket') as string

  if (!bucket) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required field: bucket', 400)
  }

  let user: { id: string } | null = null

  const { getBucketForEntity } = await import('@/lib/utils/storageBuckets')
  const beneficiariesBucket = getBucketForEntity('beneficiary')
  if (bucket === beneficiariesBucket) {
    const { adminService } = await import('@/lib/admin/service')
    const hasAdminRole =
      (await adminService.hasRole(authenticatedUser.id, 'admin')) ||
      (await adminService.hasRole(authenticatedUser.id, 'super_admin'))

    if (!hasAdminRole) {
      logger.warn('Non-admin user attempted beneficiary upload', { userId: authenticatedUser.id })
      throw new ApiError('FORBIDDEN', 'Only administrators can upload beneficiary documents', 403)
    }

    user = { id: authenticatedUser.id }
  } else {
    const allowed = await hasPermission(authenticatedUser.id, 'manage:files')
    if (!allowed) {
      logger.warn('Upload permission denied', { bucket, userId: authenticatedUser.id })
      throw new ApiError('FORBIDDEN', 'Permission denied', 403)
    }

    user = { id: authenticatedUser.id }
  }

  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const adminUser = user

  const { ipAddress, userAgent } = extractRequestInfo(request)
  await AuditService.logAdminAction(
    adminUser.id,
    'file_upload',
    'storage',
    undefined,
    { endpoint: '/api/upload', bucket },
    ipAddress,
    userAgent
  )

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for file uploads')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const file = formData.get('file') as File
  const fileName = formData.get('fileName') as string

  if (!file || !fileName || !bucket) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required fields: file, fileName, or bucket', 400)
  }

  try {
    const result = await StorageService.uploadFile(serviceSupabase, { bucket, fileName, file }, logger)

    await AuditService.logAdminAction(
      adminUser.id,
      'file_upload_success',
      'storage',
      result.path,
      {
        bucket,
        fileName,
        fileSize: file.size,
        contentType: file.type,
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.path,
      path: result.path,
      bucket: result.bucket,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'MISSING_FIELDS') {
      throw new ApiError('VALIDATION_ERROR', 'Missing required fields: file, fileName, or bucket', 400)
    }
    if (msg.startsWith('VALIDATION:')) {
      throw new ApiError('VALIDATION_ERROR', msg.replace(/^VALIDATION:/, ''), 400)
    }
    if (msg === 'INVALID_BUCKET') {
      throw new ApiError('VALIDATION_ERROR', 'Invalid bucket name', 400)
    }
    if (msg === 'INVALID_FILE_NAME') {
      throw new ApiError('VALIDATION_ERROR', 'Invalid file name', 400)
    }
    if (msg.startsWith('UPLOAD:')) {
      return NextResponse.json({ error: `Upload failed: ${msg.replace(/^UPLOAD:/, '')}` }, { status: 500 })
    }
    throw e
  }
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/upload',
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
