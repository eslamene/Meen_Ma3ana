import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseLifecycleService } from '@/lib/case-lifecycle'
import { db } from '@/lib/db'
import { cases, users, type CaseStatus } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, logger } = context
  const { id: caseId } = params

  // Get case details
  const [caseData] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))

  if (!caseData) {
    throw new ApiError('NOT_FOUND', 'Case not found', 404)
  }

  // Get user role
  const [userData] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))

  const userRole = userData?.role || 'donor'

  // Get available transitions
  const availableTransitions = CaseLifecycleService.getAvailableTransitions(
    caseData.status as CaseStatus,
    userRole,
    false
  )

  return NextResponse.json({ transitions: availableTransitions })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/transitions' 
}) 