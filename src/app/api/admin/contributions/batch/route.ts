import { NextRequest, NextResponse } from 'next/server'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

/**
 * POST /api/admin/contributions/batch
 * Batch approve or reject contributions (admin only)
 */
async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const body = await request.json()
  const { ids, action, reason, selectMode, filters } = body

  // Log request for debugging
  logger.debug('Batch contributions request:', {
    hasIds: !!ids,
    idsCount: Array.isArray(ids) ? ids.length : 0,
    action,
    selectMode,
    hasFilters: !!filters,
    body: JSON.stringify(body, null, 2)
  })

  if (!action || !['approve', 'reject'].includes(action)) {
    logger.warn('Invalid action:', { action, body })
    throw new ApiError('VALIDATION_ERROR', 'action must be either "approve" or "reject"', 400)
  }

  if (action === 'reject' && !reason) {
    logger.warn('Missing reason for reject:', { body })
    throw new ApiError('VALIDATION_ERROR', 'reason is required when rejecting contributions', 400)
  }

  // Build query based on selection mode
  let contributionsQuery = supabase
    .from('contributions')
    .select(`
      id,
      amount,
      donor_id,
      case_id,
      status,
      cases(title_en, title_ar),
      users!donor_id(first_name, last_name, email)
    `)

  if (selectMode === 'all') {
    // Select all contributions - only pending status for bulk actions
    contributionsQuery = contributionsQuery.eq('status', 'pending')
  } else if (selectMode === 'searched' && filters) {
    // Apply filters to match searched items
    // Always filter to pending status for bulk actions
    contributionsQuery = contributionsQuery.eq('status', 'pending')
    
    if (filters.dateFrom) {
      contributionsQuery = contributionsQuery.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      contributionsQuery = contributionsQuery.lte('created_at', filters.dateTo)
    }
    if (filters.amountMin) {
      contributionsQuery = contributionsQuery.gte('amount', filters.amountMin)
    }
    if (filters.amountMax) {
      contributionsQuery = contributionsQuery.lte('amount', filters.amountMax)
    }
    if (filters.paymentMethod) {
      contributionsQuery = contributionsQuery.eq('payment_method', filters.paymentMethod)
    }
    // Note: search and donorName filters are complex and would need post-processing
    // For now, we'll fetch based on simple filters and let the frontend handle search/donorName
  } else if (ids && Array.isArray(ids) && ids.length > 0) {
    // Specific IDs provided - filter to pending only
    contributionsQuery = contributionsQuery.in('id', ids).eq('status', 'pending')
  } else if (ids && Array.isArray(ids) && ids.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'IDs array cannot be empty. Please select at least one contribution.', 400)
  } else {
    throw new ApiError('VALIDATION_ERROR', 'Either ids array (with at least one ID) or selectMode must be provided', 400)
  }

  // Fetch all contributions with their related data
  const { data: contributions, error: fetchError } = await contributionsQuery

  if (fetchError) {
    logger.error('Error fetching contributions:', fetchError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch contributions', 500)
  }

  // Post-process for search and donorName filters if needed
  let filteredContributions = contributions || []
  
  // Always filter to only pending items for bulk actions (double-check)
  filteredContributions = filteredContributions.filter((c: any) => c.status === 'pending')
  
  if (selectMode === 'searched' && filters) {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredContributions = filteredContributions.filter((c: any) => {
        const caseData = Array.isArray(c.cases) ? c.cases[0] : c.cases
        const caseTitle = caseData?.title_en || caseData?.title_ar || ''
        const amount = String(c.amount || '')
        return caseTitle.toLowerCase().includes(searchLower) || amount.includes(searchLower)
      })
    }
    if (filters.donorName) {
      const donorNameLower = filters.donorName.toLowerCase()
      filteredContributions = filteredContributions.filter((c: any) => {
        const userData = Array.isArray(c.users) ? c.users[0] : c.users
        const firstName = userData?.first_name || ''
        const lastName = userData?.last_name || ''
        const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
        return fullName.includes(donorNameLower)
      })
    }
  }

  // Validate that we have contributions to process
  if (!filteredContributions || filteredContributions.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'No pending contributions found to process', 400)
  }

    const notificationService = createContributionNotificationService(supabase)
    const totalContributions = filteredContributions.length
    const contributionIds = filteredContributions.map(c => c.id)
    
    logger.info(`Starting bulk ${action} for ${totalContributions} contributions`, {
      totalContributions
    })

    // Step 1: Fetch all existing approval statuses in bulk
    const { data: existingApprovalStatuses } = await supabase
      .from('contribution_approval_status')
      .select('contribution_id, status, resubmission_count')
      .in('contribution_id', contributionIds)

    const approvalStatusMap = new Map(
      (existingApprovalStatuses || []).map((status: any) => [status.contribution_id, status])
    )

    // Step 2: Bulk update contributions status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    if (action === 'reject' && reason) {
      updateData.notes = reason
    }

    const { data: updatedContributions, error: contributionsUpdateError } = await supabase
      .from('contributions')
      .update(updateData)
      .in('id', contributionIds)
      .select(`
        id, 
        case_id, 
        amount, 
        donor_id,
        cases(title_en, title_ar)
      `)

    if (contributionsUpdateError) {
      logger.error('Error bulk updating contributions:', contributionsUpdateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update contributions', 500)
    }

    const updatedIds = new Set((updatedContributions || []).map((c: any) => c.id))
    const successCount = updatedIds.size
    const failedIds = contributionIds.filter(id => !updatedIds.has(id))
    const errors: Array<{ id: string; error: string }> = failedIds.map(id => ({
      id,
      error: 'Failed to update contribution status'
    }))

    // Step 3: Bulk update/create approval statuses
    const approvalStatusUpdates: Array<{
      contribution_id: string
      status: string
      admin_id: string
      rejection_reason?: string
      resubmission_count: number
      updated_at: string
    }> = []
    
    const approvalStatusInserts: Array<{
      contribution_id: string
      status: string
      admin_id: string
      rejection_reason?: string
      resubmission_count: number
    }> = []

    for (const contributionId of updatedIds) {
      const existingStatus = approvalStatusMap.get(contributionId)
      
      if (existingStatus) {
        // Update existing status
        approvalStatusUpdates.push({
          contribution_id: contributionId,
          status: newStatus,
          admin_id: context.user.id,
          ...(action === 'reject' && reason ? { rejection_reason: reason } : {}),
          resubmission_count: action === 'reject' ? (existingStatus.resubmission_count || 0) + 1 : (existingStatus.resubmission_count || 0),
          updated_at: new Date().toISOString()
        })
      } else {
        // Insert new status
        approvalStatusInserts.push({
          contribution_id: contributionId,
          status: newStatus,
          admin_id: context.user.id,
          ...(action === 'reject' && reason ? { rejection_reason: reason } : {}),
          resubmission_count: 0
        })
      }
    }

    // Bulk update existing approval statuses
    if (approvalStatusUpdates.length > 0) {
      const updatePromises = approvalStatusUpdates.map(update => 
        supabase
          .from('contribution_approval_status')
          .update({
            status: update.status,
            admin_id: update.admin_id,
            ...(update.rejection_reason ? { rejection_reason: update.rejection_reason } : {}),
            resubmission_count: update.resubmission_count,
            updated_at: update.updated_at
          })
          .eq('contribution_id', update.contribution_id)
      )
      
      const updateResults = await Promise.allSettled(updatePromises)
      updateResults.forEach((result, index) => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
          const contributionId = approvalStatusUpdates[index].contribution_id
          logger.warn(`Error updating approval status for contribution ${contributionId}`)
        }
      })
    }

    // Bulk insert new approval statuses
    if (approvalStatusInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('contribution_approval_status')
        .insert(approvalStatusInserts)

      if (insertError) {
        logger.error('Error bulk inserting approval statuses:', insertError)
        // Don't fail the whole operation, just log it
      }
    }

    // Step 4: Calculate case amount updates (for approve action)
    const caseAmountUpdates = new Map<string, number>()
    if (action === 'approve' && updatedContributions) {
      for (const contribution of updatedContributions) {
        if (contribution.case_id) {
          const caseId = contribution.case_id
          const amount = parseFloat(contribution.amount || '0')
          caseAmountUpdates.set(caseId, (caseAmountUpdates.get(caseId) || 0) + amount)
        }
      }
    }

    // Step 5: Update case amounts in bulk (for approve action)
    if (action === 'approve' && caseAmountUpdates.size > 0) {
      logger.info(`Updating case amounts for ${caseAmountUpdates.size} cases`)
      
      const caseIds = Array.from(caseAmountUpdates.keys())
      const { data: casesData } = await supabase
        .from('cases')
        .select('id, current_amount')
        .in('id', caseIds)
      
      if (casesData) {
        const caseUpdatePromises = casesData.map(caseData => {
          const currentAmount = parseFloat(caseData.current_amount || '0')
          const additionalAmount = caseAmountUpdates.get(caseData.id) || 0
          const newAmount = currentAmount + additionalAmount
          
          return supabase
            .from('cases')
            .update({ 
              current_amount: newAmount.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', caseData.id)
        })
        
        await Promise.allSettled(caseUpdatePromises)
      }
    }

    // Step 6: Send notifications in parallel (non-blocking)
    if (updatedContributions) {
      const notificationPromises = updatedContributions.map((contribution: any) => {
        const caseData = Array.isArray(contribution.cases) 
          ? contribution.cases[0] 
          : contribution.cases
        const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
        
        if (action === 'approve') {
          return notificationService.sendApprovalNotification(
            contribution.id,
            contribution.donor_id,
            parseFloat(contribution.amount || '0'),
            caseTitle
          ).catch((error) => {
            logger.warn(`Error sending approval notification for contribution ${contribution.id}:`, error)
          })
        } else {
          return notificationService.sendRejectionNotification(
            contribution.id,
            contribution.donor_id,
            parseFloat(contribution.amount || '0'),
            caseTitle,
            reason || ''
          ).catch((error) => {
            logger.warn(`Error sending rejection notification for contribution ${contribution.id}:`, error)
          })
        }
      })
      
      // Fire and forget - don't wait for notifications
      Promise.allSettled(notificationPromises).catch(() => {
        // Silently handle any errors
      })
    }

    const failedCount = errors.length

    logger.info(`Bulk ${action} completed`, {
      total: totalContributions,
      success: successCount,
      failed: failedCount
    })

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: totalContributions,
      errors: errors.length > 0 ? errors : undefined
    })
}

export const POST = createPostHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/contributions/batch' })


