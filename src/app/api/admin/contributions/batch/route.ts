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
  const { ids, action, reason } = body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'ids array is required and must not be empty', 400)
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    throw new ApiError('VALIDATION_ERROR', 'action must be either "approve" or "reject"', 400)
  }

  if (action === 'reject' && !reason) {
    throw new ApiError('VALIDATION_ERROR', 'reason is required when rejecting contributions', 400)
  }

    // Fetch all contributions with their related data
    const { data: contributions, error: fetchError } = await supabase
      .from('contributions')
      .select(`
        id,
        amount,
        donor_id,
        case_id,
        cases(title_en, title_ar)
      `)
      .in('id', ids)

    if (fetchError) {
      logger.error('Error fetching contributions:', fetchError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch contributions', 500)
    }

    if (!contributions || contributions.length === 0) {
      throw new ApiError('NOT_FOUND', 'No contributions found', 404)
    }

    const notificationService = createContributionNotificationService(supabase)
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ id: string; error: string }> = []

    // Process each contribution
    for (const contribution of contributions) {
      try {
        const caseData = Array.isArray(contribution.cases) 
          ? contribution.cases[0] 
          : contribution.cases
        const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'

        if (action === 'approve') {
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


