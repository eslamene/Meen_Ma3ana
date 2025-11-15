import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/security/guards'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Read formData once - we need bucket for permission check
    const formData = await request.formData()
    const bucket = formData.get('bucket') as string
    
    // Validate bucket is provided before permission check
    if (!bucket) {
      return NextResponse.json(
        { error: 'Missing required field: bucket' },
        { status: 400 }
      )
    }
    
    // For beneficiary bucket, require admin or super_admin role
    // For other buckets, require manage:files permission
    let user: { id: string } | null = null
    
    // Check if bucket is beneficiaries dynamically
    const { getBucketForEntity } = await import('@/lib/utils/storageBuckets')
    const beneficiariesBucket = getBucketForEntity('beneficiary')
    if (bucket === beneficiariesBucket) {
      // For beneficiary uploads, require admin or super_admin role
      const supabase = await createServerClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        logger.warn('Unauthenticated request to beneficiary upload', { error: authError?.message })
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if user has admin or super_admin role
      const { adminService } = await import('@/lib/admin/service')
      const hasAdminRole = await adminService.hasRole(authUser.id, 'admin') || 
                          await adminService.hasRole(authUser.id, 'super_admin')
      
      if (!hasAdminRole) {
        logger.warn('Non-admin user attempted beneficiary upload', { userId: authUser.id })
        return NextResponse.json(
          { error: 'Only administrators can upload beneficiary documents' },
          { status: 403 }
        )
      }
      
      user = { id: authUser.id }
    } else {
      // For other buckets, require manage:files permission
      const guardResult = await requirePermission('manage:files')(request)
      
      if (guardResult instanceof NextResponse) {
        // Log permission denial for debugging
        logger.warn('Upload permission denied', { bucket, status: guardResult.status })
        return guardResult
      }
      
      user = { id: guardResult.user.id }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const adminUser = user

    // Log the upload attempt
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

    // Create service client only after admin verification
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    if (!file || !fileName || !bucket) {
      return NextResponse.json(
        { error: 'Missing required fields: file, fileName, or bucket' },
        { status: 400 }
      )
    }

    // Validate file using storage rules
    const { validateUpload } = await import('@/lib/storage/validateUpload')
    const validation = await validateUpload(bucket, file)
    
    if (!validation.valid) {
      logger.warn('File validation failed', { 
        bucket, 
        fileName, 
        error: validation.error 
      })
      return NextResponse.json(
        { error: validation.error || 'File validation failed' },
        { status: 400 }
      )
    }

    // Validate bucket name to prevent path traversal
    // Use dynamic bucket validation instead of hardcoded list
    const { isValidBucket } = await import('@/lib/utils/storageBuckets')
    const isValid = await isValidBucket(bucket)
    if (!isValid) {
      logger.warn('Invalid bucket name attempted', { bucket })
      return NextResponse.json(
        { error: 'Invalid bucket name' },
        { status: 400 }
      )
    }

    // Validate fileName to prevent path traversal (allow forward slashes for folder structure)
    // But prevent '..' and backslashes which could be used for path traversal
    if (fileName.includes('..') || fileName.includes('\\') || fileName.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for Supabase upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload file using service role key (now properly authenticated)
    const { data, error } = await serviceSupabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Upload error:', error)
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Get the file URL - try public URL first, then signed URL if needed
    let fileUrl: string
    
    // First, try to get public URL (works for public buckets)
    const { data: { publicUrl } } = serviceSupabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    // For private buckets, we need signed URLs
    // Check if bucket is private dynamically
    const { isPrivateBucket } = await import('@/lib/utils/storageBuckets')
    const isPrivate = await isPrivateBucket(bucket)
    if (isPrivate) {
      try {
        // Try to create signed URL (for private buckets)
        const { data: signedUrlData, error: signedUrlError } = await serviceSupabase.storage
          .from(bucket)
          .createSignedUrl(data.path, 31536000) // 1 year in seconds
        
        if (!signedUrlError && signedUrlData?.signedUrl) {
          fileUrl = signedUrlData.signedUrl
          logger.info('Using signed URL for private bucket')
        } else {
          // Fallback to public URL if signed URL fails (bucket might be public)
          fileUrl = publicUrl
          logger.info('Using public URL (signed URL failed or bucket is public)')
        }
      } catch (signedUrlErr) {
        // If signed URL creation fails, use public URL
        fileUrl = publicUrl
        logger.warn('Signed URL creation failed, using public URL:', signedUrlErr)
      }
    } else {
      // For other buckets, use public URL
      fileUrl = publicUrl
    }
    
    logger.info('File URL generated:', { bucket, path: data.path, urlLength: fileUrl.length })

    // Log successful upload
    await AuditService.logAdminAction(
      adminUser.id,
      'file_upload_success',
      'storage',
      data.path,
      { 
        bucket,
        fileName,
        fileSize: file.size,
        contentType: file.type
      },
      ipAddress,
      userAgent
    )

    const response = {
      success: true,
      url: fileUrl,
      fileName: data.path,
      path: data.path,
      bucket: bucket
    }
    
    logger.info('Upload successful, returning response:', { 
      bucket, 
      path: data.path,
      urlLength: fileUrl.length 
    })
    
    return NextResponse.json(response)

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
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