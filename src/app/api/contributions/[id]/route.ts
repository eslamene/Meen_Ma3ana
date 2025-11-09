import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const params = await context.params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

      if (!adminCheckError && adminRoles && adminRoles.length > 0) {
        isAdmin = adminRoles.some((ur: any) => {
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

    // Fetch contribution with related data (without nested approval_status to avoid RLS issues)
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .select(`
        id,
        case_id,
        amount,
        proof_of_payment,
        payment_method_id,
        status,
        anonymous,
        created_at,
        updated_at,
        donor_id,
        notes,
        cases(
          id,
          title_en,
          title_ar
        ),
        users!contributions_donor_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        payment_methods (
          id,
          code,
          name,
          name_en,
          name_ar
        )
      `)
      .eq('id', params.id)
      .single()

    if (contributionError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching contribution:', contributionError)
      
      // Log more details about the error
      logger.error('Contribution fetch error details:', {
        contributionId: params.id,
        userId: user.id,
        isAdmin,
        errorCode: contributionError.code,
        errorMessage: contributionError.message,
        errorDetails: contributionError.details,
        errorHint: contributionError.hint
      })
      
      // Check if it's a permission/RLS issue vs not found
      if (contributionError.code === 'PGRST116' || contributionError.message?.includes('No rows')) {
        // If user is admin but got "not found", it might be RLS blocking
        if (isAdmin) {
          logger.error('Admin user got "not found" - possible RLS issue:', {
            contributionId: params.id,
            userId: user.id,
            errorCode: contributionError.code
          })
          return NextResponse.json(
            { 
              error: 'Contribution not found or access denied',
              message: 'The contribution may not exist or you may not have permission to view it'
            },
            { status: 404 }
          )
        }
      return NextResponse.json(
        { error: 'Contribution not found' },
        { status: 404 }
        )
      }
      
      // Check for RLS/permission errors
      if (contributionError.code === '42501' || contributionError.message?.includes('permission denied') || contributionError.message?.includes('row-level security')) {
        logger.error('RLS/permission error fetching contribution:', {
          contributionId: params.id,
          userId: user.id,
          isAdmin,
          errorCode: contributionError.code
        })
        return NextResponse.json(
          { 
            error: 'Access denied',
            message: 'You do not have permission to view this contribution'
          },
          { status: 403 }
        )
      }
      
      // For other errors, return a more specific message
      return NextResponse.json(
        { 
          error: 'Failed to fetch contribution',
          details: contributionError.message 
        },
        { status: 500 }
      )
    }

    // Check if user has permission to view this contribution
    // User can view their own contributions or if they're admin
    const isOwner = contribution.donor_id === user.id

    if (!isOwner && !isAdmin) {
      logger.error('Access denied for contribution:', {
        contributionId: params.id,
        userId: user.id,
        isOwner,
        isAdmin,
        donorId: contribution.donor_id
      })
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to view this contribution'
        },
        { status: 403 }
      )
    }

    // Fetch approval status separately to handle RLS gracefully
    let approvalStatus: Array<{
      id: string
      status: string
      rejection_reason?: string
      admin_comment?: string
      donor_reply?: string
      donor_reply_date?: string
      payment_proof_url?: string
      resubmission_count: number
      created_at: string
      updated_at: string
    }> = []
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
        // Log but don't fail - approval status is optional
        logger.error('Error fetching approval status (non-critical):', {
          contributionId: params.id,
          error: approvalError.message,
          errorCode: approvalError.code
        })
      }
    } catch (error) {
      // If approval status fetch fails completely, log but continue
      logger.error('Exception fetching approval status (non-critical):', error)
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
        
        // Fetch original contribution details (without nested approval_status)
        const { data: originalContributionData } = await supabase
          .from('contributions')
          .select(`
            id,
            amount,
            status,
            created_at
          `)
          .eq('id', originalId)
          .single()
        
        if (originalContributionData) {
          // Fetch approval status separately for original contribution
          let originalApproval = null
          try {
            const { data: originalApprovalData } = await supabase
              .from('contribution_approval_status')
              .select('rejection_reason, admin_comment')
              .eq('contribution_id', originalId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            if (originalApprovalData) {
              originalApproval = originalApprovalData
            }
          } catch (error) {
            // Log but don't fail - approval status is optional
            logger.error('Error fetching original contribution approval status (non-critical):', error)
          }
          
          originalContribution = {
            id: originalContributionData.id,
            amount: originalContributionData.amount,
            status: originalContributionData.status,
            created_at: originalContributionData.created_at,
            rejection_reason: originalApproval?.rejection_reason || null,
            admin_comment: originalApproval?.admin_comment || null
          }
        }
      }
    }

    // Format the response
    const caseData = Array.isArray(contribution.cases) ? contribution.cases[0] : contribution.cases
    const userData = Array.isArray(contribution.users) ? contribution.users[0] : contribution.users
    const paymentMethodData = Array.isArray(contribution.payment_methods) ? contribution.payment_methods[0] : contribution.payment_methods
    
    // Get case title based on locale (prefer locale-specific, fallback to other)
    const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
    const caseTitleAr = caseData?.title_ar || caseData?.title_en || 'Unknown Case'
    
    const formattedContribution = {
      id: contribution.id,
      caseId: contribution.case_id,
      amount: contribution.amount || 0,
      proofUrl: contribution.proof_of_payment || null,
      payment_method: paymentMethodData?.code || null,
      payment_method_id: contribution.payment_method_id || null,
      payment_method_name: paymentMethodData?.name_en || null, // Only use name_en, don't fallback to name
      payment_method_name_ar: paymentMethodData?.name_ar || null, // Only use name_ar
      status: contribution.status || 'pending',
      anonymous: contribution.anonymous || false,
      createdAt: contribution.created_at || new Date().toISOString(),
      caseTitle, // English title
      caseTitleAr, // Arabic title
      donorName: contribution.anonymous 
        ? 'Anonymous' 
        : `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Unknown Donor',
      donorId: contribution.donor_id || null,
      donorEmail: contribution.anonymous ? undefined : (userData?.email || undefined),
      donorFirstName: contribution.anonymous ? undefined : (userData?.first_name || undefined),
      donorLastName: contribution.anonymous ? undefined : (userData?.last_name || undefined),
      donorPhone: contribution.anonymous ? undefined : (userData?.phone || undefined),
      notes: contribution.notes || null,
      approval_status: approvalStatus,
      original_contribution: originalContribution,
      is_revision: isRevision
    }

    return NextResponse.json(formattedContribution)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in contributions API:', error)
    
    // Safely get contribution ID for logging
    let contributionId = 'unknown'
    try {
      const params = await context.params
      contributionId = params?.id || 'unknown'
    } catch {
      // If we can't get params, just use unknown
    }
    
    logger.error('Full error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      contributionId
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
