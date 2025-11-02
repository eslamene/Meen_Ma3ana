import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CaseLifecycleService } from '@/lib/case-lifecycle'
import { db } from '@/lib/db'
import { cases, users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const caseId = params.id

    // Get case details
    const [caseData] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, caseId))

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get user role
    const [userData] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))

    const userRole = userData?.role || 'donor'

    // Get available transitions
    const availableTransitions = CaseLifecycleService.getAvailableTransitions(
      caseData.status as any,
      userRole,
      false
    )

    return NextResponse.json({ transitions: availableTransitions })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error getting available transitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 