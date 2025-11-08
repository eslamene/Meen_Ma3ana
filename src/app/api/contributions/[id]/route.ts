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

    // Check if user is admin first (before querying, to handle RLS properly)
    let isAdmin = false
    try {
      const { data: adminRoles, error: adminCheckError } = await supabase
        .from('admin_user_roles')
        .select(`
          admin_roles (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!adminCheckError && adminRoles) {
        isAdmin = adminRoles.some((ur: any) => {
          const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
          return role?.name === 'admin' || role?.name === 'super_admin'
        })
      }
    } catch (error) {
      // If admin check fails, log but continue (user will be treated as non-admin)
      logger.error('Error checking admin status:', error)
    }

    // Fetch contribution with related data
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .select(`
        id,
        case_id,
        amount,
        proof_of_payment,
        payment_method,
        status,
        anonymous,
        created_at,
        updated_at,
        donor_id,
        notes,
        cases(
          id,
          title
        ),
        users!contributions_donor_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        contribution_approval_status(
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
      return NextResponse.json(
        { error: 'Contribution not found' },
        { status: 404 }
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
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
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
        
        // Fetch original contribution details
        const { data: originalContributionData } = await supabase
          .from('contributions')
          .select(`
            id,
            amount,
            status,
            created_at,
            contribution_approval_status(
              rejection_reason,
              admin_comment
            )
          `)
          .eq('id', originalId)
          .single()
        
        if (originalContributionData) {
          const latestApproval = originalContributionData.contribution_approval_status?.[0]
          originalContribution = {
            id: originalContributionData.id,
            amount: originalContributionData.amount,
            status: originalContributionData.status,
            created_at: originalContributionData.created_at,
            rejection_reason: latestApproval?.rejection_reason,
            admin_comment: latestApproval?.admin_comment
          }
        }
      }
    }

    // Format the response
    const caseData = Array.isArray(contribution.cases) ? contribution.cases[0] : contribution.cases
    const userData = Array.isArray(contribution.users) ? contribution.users[0] : contribution.users
    
    const formattedContribution = {
      id: contribution.id,
      caseId: contribution.case_id,
      amount: contribution.amount,
      proofUrl: contribution.proof_of_payment,
      payment_method: contribution.payment_method,
      status: contribution.status,
      anonymous: contribution.anonymous,
      createdAt: contribution.created_at,
      caseTitle: caseData?.title || 'Unknown Case',
      donorName: contribution.anonymous 
        ? 'Anonymous' 
        : `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Unknown Donor',
      donorId: contribution.donor_id,
      donorEmail: contribution.anonymous ? undefined : userData?.email,
      donorFirstName: contribution.anonymous ? undefined : userData?.first_name,
      donorLastName: contribution.anonymous ? undefined : userData?.last_name,
      donorPhone: contribution.anonymous ? undefined : userData?.phone,
      notes: contribution.notes,
      approval_status: Array.isArray(contribution.contribution_approval_status) 
        ? contribution.contribution_approval_status 
        : (contribution.contribution_approval_status ? [contribution.contribution_approval_status] : []),
      original_contribution: originalContribution,
      is_revision: isRevision
    }

    return NextResponse.json(formattedContribution)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in contributions API:', error)
    logger.error('Full error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
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
