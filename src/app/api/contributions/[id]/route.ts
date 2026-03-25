import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context

  // Check if user has admin permissions
  let isAdmin = false
  
  try {
    // Check for admin roles
    const { data: adminRoles, error: adminCheckError } = await supabase
      .from('admin_user_roles')
      .select(`
        admin_roles (*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    interface UserRole {
      admin_roles?: Array<{ name?: string; level?: number }> | { name?: string; level?: number }
    }
    if (!adminCheckError && adminRoles && adminRoles.length > 0) {
      isAdmin = adminRoles.some((ur: UserRole) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        // Check for admin or super_admin roles, or any role with level >= 8 (admin level)
        return role?.name === 'admin' || 
               role?.name === 'super_admin' || 
               (role?.level && role.level >= 8)
      })
    }
  } catch (error) {
    // If admin check fails, log but continue - user will be checked as owner
    logger.error('Error checking admin status:', error)
  }

  try {
    const { ContributionService } = await import('@/lib/services/contributionService')

    // Fetch contribution using service
    const contribution = await ContributionService.getById(supabase, params.id)

    if (!contribution) {
      if (isAdmin) {
        logger.error('Admin user got "not found" - possible RLS issue:', {
          contributionId: params.id,
          userId: user.id
        })
        throw new ApiError(
          'NOT_FOUND',
          'Contribution not found or access denied',
          404,
          { message: 'The contribution may not exist or you may not have permission to view it' }
        )
      }
      throw new ApiError('NOT_FOUND', 'Contribution not found', 404)
    }

    // Check if user has permission to view this contribution
    // User can view their own contributions or if they're admin
    const isOwner = contribution.donorId === user.id

    if (!isOwner && !isAdmin) {
      logger.error('Access denied for contribution:', {
        contributionId: params.id,
        userId: user.id,
        isOwner,
        isAdmin,
        donorId: contribution.donorId
      })
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to view this contribution'
        },
        { status: 403 }
      )
    }

    // Fetch payment method details separately (not included in normalized contribution)
    let paymentMethodData: { id?: string; code?: string; name?: string; name_en?: string; name_ar?: string } | null = null
    if (contribution.payment_method) {
      try {
        const { data: paymentMethod } = await supabase
          .from('payment_methods')
          .select('id, code, name, name_en, name_ar')
          .eq('code', contribution.payment_method)
          .maybeSingle()
        
        if (paymentMethod) {
          paymentMethodData = paymentMethod
        }
      } catch (error) {
        logger.warn('Error fetching payment method (non-critical):', { error })
      }
    }

    // Fetch approval status separately to handle RLS gracefully (service includes it but we fetch separately for better error handling)
    let approvalStatus: Array<{
      id?: string
      status: string
      rejection_reason?: string | null
      admin_comment?: string | null
      donor_reply?: string | null
      donor_reply_date?: string | null
      payment_proof_url?: string | null
      resubmission_count?: number | null
      created_at?: string | null
      updated_at?: string | null
    }> = contribution.approval_status || []
    
    // Try to fetch fresh approval status if service didn't include it
    if (approvalStatus.length === 0) {
      try {
        const { data: approvalData, error: approvalError } = await supabase
          .from('contribution_approval_status')
          .select(`
            id,
            status,
            rejection_reason,
            admin_comment,
            donor_reply,
            donor_reply_date,
            payment_proof_url,
            resubmission_count,
            created_at,
            updated_at
          `)
          .eq('contribution_id', params.id)
          .order('created_at', { ascending: false })

        if (!approvalError && approvalData) {
          approvalStatus = approvalData
        } else if (approvalError) {
          logger.error('Error fetching approval status (non-critical):', {
            contributionId: params.id,
            error: approvalError.message,
            errorCode: approvalError.code
          })
        }
      } catch (error) {
        logger.error('Exception fetching approval status (non-critical):', error)
      }
    }

    // Check if this is a revision contribution
    let originalContribution = null
    let isRevision = false
    
    if (contribution.notes && contribution.notes.includes('REVISION:')) {
      isRevision = true
      
      // Try to extract original contribution ID from notes
      const revisionMatch = contribution.notes.match(/REVISION:.*Original contribution ID: ([a-f0-9-]+)/i)
      if (revisionMatch) {
        const originalId = revisionMatch[1]
        
        // Fetch original contribution using service
        const originalContributionData = await ContributionService.getById(supabase, originalId)
        
        if (originalContributionData) {
          // Get approval status from original contribution
          const originalApproval = originalContributionData.approval_status?.[0] || null
          
          originalContribution = {
            id: originalContributionData.id,
            amount: originalContributionData.amount,
            status: originalContributionData.status,
            created_at: originalContributionData.createdAt,
            rejection_reason: originalApproval?.rejection_reason || null,
            admin_comment: originalApproval?.admin_comment || null
          }
        }
      }
    }

    // Format the response using normalized contribution fields
    const formattedContribution = {
      id: contribution.id,
      caseId: contribution.caseId,
      amount: contribution.amount || 0,
      proofUrl: contribution.proofUrl || null,
      payment_method: paymentMethodData?.code || contribution.payment_method || null,
      payment_method_id: null, // Not available in normalized contribution
      payment_method_name: paymentMethodData?.name_en || null,
      payment_method_name_ar: paymentMethodData?.name_ar || null,
      status: contribution.status || 'pending',
      anonymous: contribution.anonymous || false,
      createdAt: contribution.createdAt || new Date().toISOString(),
      caseTitle: contribution.caseTitle || 'Unknown Case',
      caseTitleAr: contribution.caseTitle || 'Unknown Case', // TODO: Add caseTitleAr to normalized contribution
      donorName: contribution.anonymous 
        ? 'Anonymous' 
        : contribution.donorName || 'Unknown Donor',
      donorId: contribution.donorId || null,
      donorEmail: contribution.anonymous ? undefined : (contribution.donorEmail || undefined),
      donorFirstName: contribution.anonymous ? undefined : (contribution.donorFirstName || undefined),
      donorLastName: contribution.anonymous ? undefined : (contribution.donorLastName || undefined),
      donorPhone: contribution.anonymous ? undefined : (contribution.donorPhone || undefined),
      notes: contribution.notes || null,
      approval_status: approvalStatus,
      original_contribution: originalContribution,
      is_revision: isRevision
    }

    return NextResponse.json(formattedContribution)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching contribution:', { error, contributionId: params.id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch contribution', 500)
  }
}

export const GET = createGetHandlerWithParams<{ id: string }>(handler, { requireAuth: true, loggerContext: 'api/contributions/[id]' })
