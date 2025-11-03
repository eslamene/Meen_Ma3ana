import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
        cases!inner(
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
      return NextResponse.json(
        { error: 'Contribution not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this contribution
    // User can view their own contributions or if they're admin
    const isOwner = contribution.donor_id === user.id
    
    // Check if user is admin (you might want to add a proper admin check here)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .single()

    const isAdmin = userRole?.roles?.name === 'admin' || userRole?.roles?.name === 'super_admin'

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
    const formattedContribution = {
      id: contribution.id,
      caseId: contribution.case_id,
      amount: contribution.amount,
      proofUrl: contribution.proof_of_payment,
      payment_method: contribution.payment_method,
      status: contribution.status,
      anonymous: contribution.anonymous,
      createdAt: contribution.created_at,
      caseTitle: contribution.cases?.title || 'Unknown Case',
      donorName: contribution.anonymous 
        ? 'Anonymous' 
        : `${contribution.users?.first_name || ''} ${contribution.users?.last_name || ''}`.trim() || 'Unknown Donor',
      donorId: contribution.donor_id,
      donorEmail: contribution.anonymous ? undefined : contribution.users?.email,
      donorFirstName: contribution.anonymous ? undefined : contribution.users?.first_name,
      donorLastName: contribution.anonymous ? undefined : contribution.users?.last_name,
      donorPhone: contribution.anonymous ? undefined : contribution.users?.phone,
      notes: contribution.notes,
      approval_status: contribution.contribution_approval_status || [],
      original_contribution: originalContribution,
      is_revision: isRevision
    }

    return NextResponse.json(formattedContribution)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in contributions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
