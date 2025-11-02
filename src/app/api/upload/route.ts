import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/security/guards'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Use permission guard
    const guardResult = await requirePermission('manage:files')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user: adminUser, supabase } = guardResult

    // Log the upload attempt
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'file_upload',
      'storage',
      undefined,
      { endpoint: '/api/upload' },
      ipAddress,
      userAgent
    )

    // Create service client only after admin verification
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const bucket = formData.get('bucket') as string

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
    const allowedBuckets = ['case-images', 'contributions', 'case-files']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket name' },
        { status: 400 }
      )
    }

    // Validate fileName to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
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