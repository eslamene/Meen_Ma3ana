import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'

/**
 * GET /api/admin/contributions
 * Get contributions with filters - uses /api/contributions API internally
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    // Extract query parameters from the request
    const { searchParams } = new URL(request.url)
    
    // Build the URL for the internal API call
    // Use the request URL to construct the base URL reliably
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    
    // Build query parameters for the internal API call
    const internalParams = new URLSearchParams()
    
    // Copy all query parameters from the admin request
    searchParams.forEach((value, key) => {
      internalParams.append(key, value)
    })
    
    // Ensure admin=true is set for admin-level access
    internalParams.set('admin', 'true')
    
    // Construct the internal API URL
    const internalApiUrl = `${baseUrl}/api/contributions?${internalParams.toString()}`
    
    logger.info('Forwarding admin contributions request to internal API', {
      internalUrl: internalApiUrl,
      queryParams: Object.fromEntries(internalParams)
    })
    
    // Make internal API call
    const response = await fetch(internalApiUrl, {
      method: 'GET',
      headers: {
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
        // Forward cookie header for session
        ...(request.headers.get('cookie') && {
          'cookie': request.headers.get('cookie')!
        }),
      },
      // Disable caching for internal API calls
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `Internal API returned ${response.status}` 
      }))
      
      logger.error('Internal API call failed', {
        status: response.status,
        error: errorData
      })
      
      throw new ApiError(
        'INTERNAL_SERVER_ERROR',
        errorData.error || errorData.message || 'Failed to fetch contributions',
        response.status
      )
    }
    
    const data = await response.json()
    
    logger.debug('Successfully forwarded admin contributions request', {
      contributionsCount: data.contributions?.length || 0,
      pagination: data.pagination
    })
    
    // Return the response from the internal API
    return NextResponse.json(data)
    
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    // Wrap other errors
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Admin contributions fetch error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch contributions', 500)
  }
}

/**
 * POST /api/admin/contributions
 * Create a contribution as admin (for already paid contributions)
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user: adminUser } = context

  try {
    const body = await request.json()
    const { caseId, donorId, amount, paymentMethod, notes, anonymous, proofOfPayment } = body

    // Validate required fields
    if (!caseId || !donorId || !amount || !paymentMethod) {
      throw new ApiError('VALIDATION_ERROR', 'Missing required fields: caseId, donorId, amount, and paymentMethod are required', 400)
    }

    if (amount <= 0) {
      throw new ApiError('VALIDATION_ERROR', 'Amount must be greater than 0', 400)
    }

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_contribution_create',
      'contribution',
      undefined,
      { caseId, donorId, amount },
      ipAddress,
      userAgent
    )

    logger.info('Admin creating contribution', { caseId, donorId, amount, adminUserId: adminUser.id })

    // Convert payment method code to UUID if needed
    let paymentMethodId: string | null = null
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(paymentMethod)) {
      paymentMethodId = paymentMethod
    } else {
      // Look up by code
      const { data: paymentMethodData, error: pmError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('code', paymentMethod)
        .eq('is_active', true)
        .single()

      if (pmError || !paymentMethodData) {
        logger.error('Payment method lookup error:', pmError)
        throw new ApiError('VALIDATION_ERROR', `Invalid payment method: ${paymentMethod}`, 400)
      }

      paymentMethodId = paymentMethodData.id
    }

    // Use ContributionService to create admin contribution
    const { ContributionService } = await import('@/lib/services/contributionService')
    const { contribution, approvalStatusCreated } = await ContributionService.createAdminContribution(supabase, {
      caseId,
      donorId,
      amount: parseFloat(amount),
      paymentMethodId,
      proofOfPayment: proofOfPayment || null,
      anonymous: anonymous || false,
      notes: notes || null,
      adminId: adminUser.id
    })

    if (!approvalStatusCreated) {
      logger.warn('Approval status was not created (non-critical)')
    }

    // Get case data for notifications
    const { CaseService } = await import('@/lib/services/caseService')
    const caseData = await CaseService.getById(supabase, caseId)

    // Send approval notification to donor
    try {
      const notificationService = createContributionNotificationService(supabase)
      const caseTitle = caseData.title_en || caseData.title_ar || 'Unknown Case'
      
      await notificationService.sendApprovalNotification(
        contribution.id,
        donorId,
        parseFloat(amount),
        caseTitle
      )
    } catch (notificationError) {
      logger.warn('Error sending approval notification (non-critical):', notificationError)
      // Don't fail the request if notification fails
    }

    logger.info('Admin contribution created successfully', { contributionId: contribution.id })

    return NextResponse.json({
      success: true,
      contribution,
      message: 'Contribution created and approved successfully'
    }, { status: 201 })

  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    // Wrap other errors
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Admin contribution creation error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create contribution', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/contributions'
})

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/contributions'
})

