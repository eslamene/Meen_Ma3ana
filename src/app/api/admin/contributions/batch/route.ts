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
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ id: string; error: string }> = []

    // Process each contribution
    for (const contribution of filteredContributions) {
      try {
        const caseData = Array.isArray(contribution.cases) 
          ? contribution.cases[0] 
          : contribution.cases
        const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'

        if (action === 'approve') {
          // Check if approval status exists
          const { data: existingStatus } = await supabase
            .from('contribution_approval_status')
            .select('*')
            .eq('contribution_id', contribution.id)
            .single()

          // Create or update approval status
          if (existingStatus) {
            const { error: approvalUpdateError } = await supabase
              .from('contribution_approval_status')
              .update({
                status: 'approved',
                admin_id: context.user.id,
                updated_at: new Date().toISOString()
              })
              .eq('contribution_id', contribution.id)

            if (approvalUpdateError) {
              logger.error(`Error updating approval status for contribution ${contribution.id}:`, approvalUpdateError)
            }
          } else {
            const { error: approvalInsertError } = await supabase
              .from('contribution_approval_status')
              .insert({
                contribution_id: contribution.id,
                status: 'approved',
                admin_id: context.user.id,
                resubmission_count: 0
              })

            if (approvalInsertError) {
              logger.error(`Error creating approval status for contribution ${contribution.id}:`, approvalInsertError)
            }
          }

          // Update contribution status
          const { error: updateError } = await supabase
            .from('contributions')
            .update({ 
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', contribution.id)

          if (updateError) {
            logger.error(`Error approving contribution ${contribution.id}:`, updateError)
            failedCount++
            errors.push({ 
              id: contribution.id, 
              error: updateError.message 
            })
            continue
          }

          // Update case current_amount (add the contribution amount)
          if (contribution.case_id) {
            // Get current amount
            const { data: caseData, error: caseFetchError } = await supabase
              .from('cases')
              .select('current_amount')
              .eq('id', contribution.case_id)
              .single()

            if (!caseFetchError && caseData) {
              const currentAmount = parseFloat(caseData.current_amount || '0')
              const newAmount = currentAmount + parseFloat(contribution.amount || '0')

              const { error: caseUpdateError } = await supabase
                .from('cases')
                .update({ 
                  current_amount: newAmount.toString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', contribution.case_id)

              if (caseUpdateError) {
                logger.warn(`Error updating case amount for contribution ${contribution.id}:`, caseUpdateError)
                // Don't fail the whole operation, just log it
              }
            }
          }

          // Send approval notification
          try {
            await notificationService.sendApprovalNotification(
              contribution.id,
              contribution.donor_id,
              parseFloat(contribution.amount || '0'),
              caseTitle
            )
          } catch (notificationError) {
            logger.warn(`Error sending approval notification for contribution ${contribution.id}:`, notificationError)
            // Don't fail the operation if notification fails
          }

          successCount++
        } else if (action === 'reject') {
          // Check if approval status exists
          const { data: existingStatus } = await supabase
            .from('contribution_approval_status')
            .select('*')
            .eq('contribution_id', contribution.id)
            .single()

          // Create or update approval status
          if (existingStatus) {
            const { error: approvalUpdateError } = await supabase
              .from('contribution_approval_status')
              .update({
                status: 'rejected',
                admin_id: context.user.id,
                rejection_reason: reason,
                resubmission_count: existingStatus.resubmission_count + 1,
                updated_at: new Date().toISOString()
              })
              .eq('contribution_id', contribution.id)

            if (approvalUpdateError) {
              logger.error(`Error updating approval status for contribution ${contribution.id}:`, approvalUpdateError)
            }
          } else {
            const { error: approvalInsertError } = await supabase
              .from('contribution_approval_status')
              .insert({
                contribution_id: contribution.id,
                status: 'rejected',
                admin_id: context.user.id,
                rejection_reason: reason,
                resubmission_count: 0
              })

            if (approvalInsertError) {
              logger.error(`Error creating approval status for contribution ${contribution.id}:`, approvalInsertError)
            }
          }

          // Update contribution status
          const { error: updateError } = await supabase
            .from('contributions')
            .update({ 
              status: 'rejected',
              notes: reason,
              updated_at: new Date().toISOString()
            })
            .eq('id', contribution.id)

          if (updateError) {
            logger.error(`Error rejecting contribution ${contribution.id}:`, updateError)
            failedCount++
            errors.push({ 
              id: contribution.id, 
              error: updateError.message 
            })
            continue
          }

          // Send rejection notification
          try {
            await notificationService.sendRejectionNotification(
              contribution.id,
              contribution.donor_id,
              parseFloat(contribution.amount || '0'),
              caseTitle,
              reason
            )
          } catch (notificationError) {
            logger.warn(`Error sending rejection notification for contribution ${contribution.id}:`, notificationError)
            // Don't fail the operation if notification fails
          }

          successCount++
        }
      } catch (error) {
        logger.error(`Unexpected error processing contribution ${contribution.id}:`, error)
        failedCount++
        errors.push({ 
          id: contribution.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    })
}

export const POST = createPostHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/contributions/batch' })


