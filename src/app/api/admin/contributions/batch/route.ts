import { NextRequest, NextResponse } from 'next/server'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import {
  ContributionBatchService,
  type BatchContributionBody,
} from '@/lib/services/contributionBatchService'

/**
 * POST /api/admin/contributions/batch
 * Batch approve or reject contributions (admin only)
 */
async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const body = (await request.json()) as BatchContributionBody

  logger.debug('Batch contributions request:', {
    hasIds: !!body.ids,
    idsCount: Array.isArray(body.ids) ? body.ids.length : 0,
    action: body.action,
    selectMode: body.selectMode,
    hasFilters: !!body.filters,
  })

  let result: Awaited<ReturnType<typeof ContributionBatchService.processBatch>>
  try {
    result = await ContributionBatchService.processBatch(
      supabase,
      context.user.id,
      body,
      logger
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.startsWith('VALIDATION:')) {
      throw new ApiError('VALIDATION_ERROR', msg.replace(/^VALIDATION:\s*/, ''), 400)
    }
    logger.error('Batch contribution error:', e)
    throw new ApiError('INTERNAL_SERVER_ERROR', msg || 'Batch processing failed', 500)
  }

  const notificationService = createContributionNotificationService(supabase)
  const { action, reason } = body

  if (result.updatedContributions?.length) {
    const notificationPromises = result.updatedContributions.map((contribution) => {
      const caseData = Array.isArray(contribution.cases) ? contribution.cases[0] : contribution.cases
      const caseDataObj = caseData as { title_en?: string; title_ar?: string } | undefined
      const caseTitle = caseDataObj?.title_en || caseDataObj?.title_ar || 'Unknown Case'

      if (action === 'approve') {
        return notificationService
          .sendApprovalNotification(
            contribution.id,
            contribution.donor_id || '',
            parseFloat(String(contribution.amount || '0')),
            caseTitle
          )
          .catch((error) => {
            logger.warn(`Error sending approval notification for contribution ${contribution.id}:`, error)
          })
      }
      return notificationService
        .sendRejectionNotification(
          contribution.id,
          contribution.donor_id || '',
          parseFloat(String(contribution.amount || '0')),
          caseTitle,
          reason || ''
        )
        .catch((error) => {
          logger.warn(`Error sending rejection notification for contribution ${contribution.id}:`, error)
        })
    })

    Promise.allSettled(notificationPromises).catch(() => {})
  }

  return NextResponse.json({
    success: result.success,
    failed: result.failed,
    total: result.total,
    errors: result.errors,
  })
}

export const POST = createPostHandler(handler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/contributions/batch',
})
