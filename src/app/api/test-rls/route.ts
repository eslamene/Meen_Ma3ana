import { NextRequest, NextResponse } from 'next/server'
import { SecurityService } from '@/lib/security/rls'
import { db } from '@/lib/db'
import { cases, users, contributions } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
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
    
    const { user, supabase } = guardResult

    // Log the test access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      'test_rls_access',
      'api',
      'test-rls',
      { endpoint: '/api/test-rls' },
      ipAddress,
      userAgent
    )

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    
    // Set security context
    await SecurityService.setSecurityContext(user.id, userRole)
    
    const results: {
      user: { id: string; role: any; email?: string }
      accessibleCases: any[]
      accessibleContributions: any[]
      accessibleUsers: any[]
    } = {
      user: {
        id: user.id,
        role: userRole,
        email: user.email
      },
      accessibleCases: [],
      accessibleContributions: [],
      accessibleUsers: []
    }

    try {
      // Test cases access
      const casesResult = await db.select({
        id: cases.id,
        title: cases.title_en,
        status: cases.status,
        createdBy: cases.created_by
      }).from(cases).limit(5)
      
      results.accessibleCases = casesResult
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error accessing cases:', error)
      results.accessibleCases = [{ error: 'Access denied' }]
    }

    try {
      // Test contributions access
      const contributionsResult = await db.select({
        id: contributions.id,
        amount: contributions.amount,
        status: contributions.status,
        donorId: contributions.donor_id
      }).from(contributions).limit(5)
      
      results.accessibleContributions = contributionsResult
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error accessing contributions:', error)
      results.accessibleContributions = [{ error: 'Access denied' }]
    }

    try {
      // Test users access (should be restricted)
      const usersResult = await db.select({
        id: users.id,
        email: users.email,
        role: users.role
      }).from(users).limit(5)
      
      results.accessibleUsers = usersResult
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error accessing users:', error)
      results.accessibleUsers = [{ error: 'Access denied' }]
    }

    // Clear security context
    await SecurityService.clearSecurityContext()

    return NextResponse.json({
      success: true,
      warning: 'This is a test endpoint - not for production use',
      message: 'RLS test completed',
      results
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'RLS test error:', error)
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

    // Use permission guard
    const guardResult = await requirePermission('admin:system')(request)
    if (guardResult instanceof NextResponse) {
      return guardResult
    }
    
    const { user } = guardResult

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    const body = await request.json()
    const { action, resourceType, resourceId } = body

    // Set security context
    await SecurityService.setSecurityContext(user.id, userRole)

    // Test resource access
    const canAccess = await SecurityService.canAccessResource(
      user.id,
      resourceType,
      resourceId
    )

    // Log the test access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      user.id,
      'test_resource_access',
      resourceType,
      resourceId,
      { 
        canAccess,
        userRole,
        action,
        endpoint: '/api/test-rls'
      },
      ipAddress,
      userAgent
    )

    // Clear security context
    await SecurityService.clearSecurityContext()

    return NextResponse.json({
      success: true,
      canAccess,
      userRole,
      resourceType,
      resourceId
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Resource access test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 