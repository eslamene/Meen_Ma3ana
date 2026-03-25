import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { eq, and, inArray } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/lib/db'
import { adminUserRoles, adminRoles } from '@/drizzle/schema'
import { defaultLogger } from '@/lib/logger'

async function getAdminNotifierUserIds(): Promise<string[]> {
  try {
    const rows = await db
      .select({ userId: adminUserRoles.user_id })
      .from(adminUserRoles)
      .innerJoin(adminRoles, eq(adminUserRoles.role_id, adminRoles.id))
      .where(
        and(eq(adminUserRoles.is_active, true), inArray(adminRoles.name, ['admin', 'super_admin']))
      )
    return [...new Set(rows.map((r) => r.userId))]
  } catch (e) {
    defaultLogger.warn('Could not load admin users for sponsorship notification', { error: e })
    return []
  }
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context

  const body = (await request.json()) as {
    case_id?: string
    amount?: number
    terms?: string | null
    start_date?: string
    end_date?: string
    commitment_type?: string
  }

  const caseId = body.case_id
  const amount = body.amount
  const terms = body.terms ?? null
  const startDate = body.start_date
  const endDate = body.end_date

  if (!caseId || typeof caseId !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'case_id is required', 400)
  }
  if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'Valid positive amount is required', 400)
  }
  if (!startDate || typeof startDate !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'start_date is required', 400)
  }
  if (!endDate || typeof endDate !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'end_date is required', 400)
  }

  const { CaseService } = await import('@/lib/services/caseService')
  const caseRow = await CaseService.getById(supabase, caseId)
  if (!caseRow || caseRow.status !== 'published') {
    throw new ApiError('NOT_FOUND', 'Case not found or not open for sponsorship', 404)
  }

  const { SponsorshipService } = await import('@/lib/services/sponsorshipService')
  const { NotificationService } = await import('@/lib/services/notificationService')

  let sponsorship: Awaited<ReturnType<typeof SponsorshipService.create>>
  try {
    sponsorship = await SponsorshipService.create(supabase, {
      sponsor_id: user.id,
      case_id: caseId,
      amount,
      status: 'pending',
      terms,
      start_date: startDate,
      end_date: endDate,
    })
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Sponsorship create failed', { error: e })
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      e instanceof Error ? e.message : 'Failed to create sponsorship request',
      500
    )
  }

  const caseTitle =
    caseRow.title_en || caseRow.title_ar || sponsorship.case?.title_en || sponsorship.case?.title_ar || 'Case'

  const adminIds = await getAdminNotifierUserIds()
  if (adminIds.length > 0 && env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await Promise.all(
      adminIds.map((recipientId) =>
        NotificationService.create(serviceSupabase, {
          type: 'sponsorship_request',
          recipient_id: recipientId,
          title: 'New Sponsorship Request',
          message: `A new sponsorship request was submitted for: ${caseTitle}`,
          data: {
            caseId,
            sponsorId: user.id,
            amount,
            sponsorshipId: sponsorship.id,
            commitmentType: body.commitment_type ?? null,
          },
        }).catch((err) => {
          logger.warn('Failed to notify admin of sponsorship request', { recipientId, error: err })
        })
      )
    )
  } else if (adminIds.length > 0) {
    logger.warn('Skipping sponsorship admin notifications: SUPABASE_SERVICE_ROLE_KEY not set')
  }

  return NextResponse.json({ success: true, sponsorship })
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/sponsor/requests',
})
