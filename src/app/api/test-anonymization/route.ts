import { NextRequest, NextResponse } from 'next/server'
import { AnonymizationService } from '@/lib/security/anonymization'
import { SecurityService } from '@/lib/security/rls'
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

    // Require admin permission
    const authResult = await requirePermission('admin:dashboard')(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    const userRole = await SecurityService.getCurrentUserRole(user.id)

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'partial'
    const type = searchParams.get('type') || 'all'

    let result: any = {}

    switch (type) {
      case 'users':
        result.users = await AnonymizationService.getAnonymizedUsers(level)
        break
      case 'cases':
        result.cases = await AnonymizationService.getAnonymizedCases(level)
        break
      case 'contributions':
        result.contributions = await AnonymizationService.getAnonymizedContributions(level)
        break
      case 'stats':
        result.stats = await AnonymizationService.getAnonymizationStats()
        break
      case 'export':
        result.export = await AnonymizationService.exportAnonymizedData(level)
        break
      default:
        // Test all anonymization functions
        result = {
          testEmail: AnonymizationService.anonymizeEmail('test@example.com', level),
          testPhone: AnonymizationService.anonymizePhone('+1234567890', level),
          testName: AnonymizationService.anonymizeName('John Doe', level),
          testAddress: AnonymizationService.anonymizeAddress('123 Main St, City, State', level),
          testAmount: AnonymizationService.anonymizeAmount(1500, level),
          users: await AnonymizationService.getAnonymizedUsers(level),
          cases: await AnonymizationService.getAnonymizedCases(level),
          contributions: await AnonymizationService.getAnonymizedContributions(level),
          stats: await AnonymizationService.getAnonymizationStats()
        }
    }

    // Log the test access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      'test_anonymization',
      'api',
      'test-anonymization',
      { 
        level, 
        type, 
        userRole,
        endpoint: '/api/test-anonymization'
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Anonymization test completed',
      level,
      type,
      result
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Anonymization test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Require admin permission
    const authResult = await requirePermission('admin:dashboard')(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    const userRole = await SecurityService.getCurrentUserRole(user.id)

    const body = await request.json()
    const { action } = body

    const result: any = {}

    switch (action) {
      case 'create_views':
        result.success = await AnonymizationService.createAnonymizedViews()
        result.message = result.success ? 'Anonymized views created successfully' : 'Failed to create views'
        break
      case 'export_data':
        const level = body.level || 'partial'
        result.data = await AnonymizationService.exportAnonymizedData(level)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      `anonymization_${action}`,
      'api',
      'test-anonymization',
      { 
        action,
        userRole,
        endpoint: '/api/test-anonymization'
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Anonymization action completed',
      result
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Anonymization action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 