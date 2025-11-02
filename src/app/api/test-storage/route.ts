import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/security/guards'
import { isTestEnabled } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check if test endpoints are enabled
    if (!isTestEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Test endpoints are disabled'
      }, { status: 404 })
    }

    // Use permission guard
    const guardResult = await requirePermission('admin:system')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user } = guardResult

    // Log the test access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      'test_storage_access',
      'api',
      'test-storage',
      { endpoint: '/api/test-storage' },
      ipAddress,
      userAgent
    )

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Test if the URL is accessible (no service role needed for this)
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' })
      
      return NextResponse.json({
        url: imageUrl,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (error) {
      return NextResponse.json({
        url: imageUrl,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Storage test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 