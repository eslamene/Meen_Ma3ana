import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, requireAnyPermission } from '@/lib/security/guards'
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
    
    // For beneficiary bucket, allow any authenticated user (similar to beneficiary update route)
    // For other buckets, require manage:files permission
    let user: { id: string } | null = null
    
    if (bucket === 'beneficiaries') {
      // For beneficiary uploads, just check if user is authenticated
      const supabase = await createServerClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        logger.warn('Unauthenticated request to beneficiary upload', { error: authError?.message })
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
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

    // Validate file type - stricter allowlist
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, GIF, WebP, and PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Validate bucket name to prevent path traversal
    const allowedBuckets = ['case-images', 'contributions', 'case-files', 'beneficiaries']
    if (!allowedBuckets.includes(bucket)) {
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

    // Get the public URL
    const { data: { publicUrl } } = serviceSupabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

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

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: data.path
    })

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
  const logger = new Logger()

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 