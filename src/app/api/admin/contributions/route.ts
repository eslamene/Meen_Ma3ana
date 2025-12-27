import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'

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

    // Verify case exists
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, status, current_amount')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    // Verify donor exists
    const { data: donorData, error: donorError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', donorId)
      .single()

    if (donorError || !donorData) {
      throw new ApiError('NOT_FOUND', 'Donor not found', 404)
    }

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

    // Create contribution with approved status (already paid)
    const { data: contribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: amount,
        payment_method_id: paymentMethodId,
        status: 'approved', // Admin-created contributions are already paid
        proof_of_payment: proofOfPayment || null,
        anonymous: anonymous || false,
        donor_id: donorId,
        case_id: caseId,
        notes: notes || null,
        created_by_admin: true,
        admin_id: adminUser.id
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error inserting contribution:', insertError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create contribution: ${insertError.message}`, 500)
    }

    // Create approval status record (approved by admin)
    const { error: approvalError } = await supabase
      .from('contribution_approval_status')
      .insert({
        contribution_id: contribution.id,
        status: 'approved',
        admin_id: adminUser.id,
        admin_comment: 'Contribution created and approved by admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (approvalError) {
      logger.error('Error creating approval status:', approvalError)
      // Don't fail the request, but log the error
    }

    // Update case amount
    try {
      const currentAmount = parseFloat(caseData.current_amount || '0')
      const newAmount = currentAmount + parseFloat(amount)
      
      const { error: updateError } = await supabase
        .from('cases')
        .update({ current_amount: newAmount.toString() })
        .eq('id', caseId)

      if (updateError) {
        logger.warn('Error updating case amount (non-critical):', updateError)
      }
    } catch (updateError) {
      logger.warn('Error updating case amount (non-critical):', updateError)
    }

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

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/contributions'
})

