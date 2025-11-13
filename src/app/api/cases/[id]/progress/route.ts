import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { contributions, contributionApprovalStatus } from '@/drizzle/schema'
import { eq, and, sql, sum } from 'drizzle-orm'
import { RouteContext } from '@/types/next-api'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/cases/[id]/progress
 * 
 * Public endpoint to get case funding progress.
 * Returns the total approved contributions for a case without exposing
 * individual contribution details or donor information.
 * 
 * This endpoint is accessible to both authenticated and unauthenticated users.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const { id: caseId } = await context.params
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Verify case exists and is published (public cases only)
    const supabase = await createClient()
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, status, target_amount, current_amount, created_by')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      logger.logStableError('RESOURCE_NOT_FOUND', 'Case not found:', caseError)
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Only allow public access to published cases
    if (caseData.status !== 'published') {
      // Check if user is authenticated and has permission
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Case not available' },
          { status: 403 }
        )
      }
      
      // Check if user is admin or case creator
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin'
      const isCreator = caseData.created_by === user.id
      
      if (!isAdmin && !isCreator) {
        return NextResponse.json(
          { error: 'Case not available' },
          { status: 403 }
        )
      }
    }

    // Calculate total approved contributions using Drizzle (bypasses RLS)
    // This query uses a direct database connection, not Supabase client
    const approvedContributionsResult = await db
      .select({ 
        total: sum(contributions.amount)
      })
      .from(contributions)
      .innerJoin(
        contributionApprovalStatus,
        eq(contributions.id, contributionApprovalStatus.contribution_id)
      )
      .where(
        and(
          eq(contributions.case_id, caseId),
          eq(contributions.status, 'approved'),
          eq(contributionApprovalStatus.status, 'approved')
        )
      )

    const approvedTotal = Number(approvedContributionsResult[0]?.total || 0)

    // Get contributor count (distinct donors with approved contributions)
    const contributorCountResult = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${contributions.donor_id})`
      })
      .from(contributions)
      .innerJoin(
        contributionApprovalStatus,
        eq(contributions.id, contributionApprovalStatus.contribution_id)
      )
      .where(
        and(
          eq(contributions.case_id, caseId),
          eq(contributions.status, 'approved'),
          eq(contributionApprovalStatus.status, 'approved')
        )
      )

    const contributorCount = Number(contributorCountResult[0]?.count || 0)

    // Calculate progress percentage
    const targetAmount = Number(caseData.target_amount || 0)
    const progressPercentage = targetAmount > 0 
      ? Math.min((approvedTotal / targetAmount) * 100, 100)
      : 0

    return NextResponse.json({
      caseId,
      approvedTotal,
      targetAmount,
      progressPercentage: Math.round(progressPercentage * 100) / 100, // Round to 2 decimal places
      contributorCount,
      status: caseData.status,
      // Include current_amount from case for backward compatibility
      currentAmount: Number(caseData.current_amount || 0)
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

