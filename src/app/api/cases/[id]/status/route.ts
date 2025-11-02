import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CaseLifecycleService } from '@/lib/case-lifecycle'
import { db } from '@/lib/db'
import { cases, contributions } from '@/drizzle/schema'
import { eq, sum } from 'drizzle-orm'

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

    // Get case status history
    const historyResult = await CaseLifecycleService.getCaseStatusHistory(caseId)
    
    if (!historyResult.success) {
      return NextResponse.json({ error: historyResult.error }, { status: 500 })
    }

    return NextResponse.json({ history: historyResult.history })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error getting case status history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const body = await request.json()
    const { newStatus, changeReason, systemTriggered = false } = body

    // Change case status
    const result = await CaseLifecycleService.changeCaseStatus({
      caseId,
      newStatus,
      changedBy: user.id,
      systemTriggered,
      changeReason
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ case: result.case })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error changing case status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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
    const body = await request.json()
    const { action } = body

    if (action === 'check-automatic-closure') {
      // Check if case should be automatically closed
      const result = await checkAndCloseCaseIfFullyFunded(caseId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error processing case action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkAndCloseCaseIfFullyFunded(caseId: string) {
  try {
    // Get case details
    const [caseData] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, caseId))

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Only check one-time cases that are published
    if (caseData.type !== 'one-time' || caseData.status !== 'published') {
      return { success: false, error: 'Case is not eligible for automatic closure' }
    }

    // Calculate total contributions
    const [totalContributions] = await db
      .select({ total: sum(contributions.amount) })
      .from(contributions)
      .where(eq(contributions.caseId, caseId))

    const totalAmount = parseFloat(totalContributions?.total || '0')
    const targetAmount = parseFloat(caseData.targetAmount || '0')

    // Check if case is fully funded
    if (totalAmount >= targetAmount) {
      // Automatically close the case
      const result = await CaseLifecycleService.changeCaseStatus({
        caseId,
        newStatus: 'closed',
        systemTriggered: true,
        changeReason: 'Case automatically closed - funding goal reached'
      })

      if (result.success) {
        return {
          success: true,
          message: 'Case automatically closed due to full funding',
          case: result.case
        }
      } else {
        return { success: false, error: result.error }
      }
    } else {
      return {
        success: true,
        message: 'Case not yet fully funded',
        currentAmount: totalAmount,
        targetAmount: targetAmount,
        remainingAmount: targetAmount - totalAmount
      }
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking automatic closure:', error)
    return { success: false, error: 'Failed to check automatic closure' }
  }
} 