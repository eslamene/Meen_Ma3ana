import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  try {
    const { UserService } = await import('@/lib/services/userService')
    const { ContributionService } = await import('@/lib/services/contributionService')

    // Fetch user profile data
    const userProfile = await UserService.getById(supabase, user.id)
    
    if (!userProfile) {
      throw new ApiError('NOT_FOUND', 'User profile not found', 404)
    }

    // Fetch contribution history with case information
    const contributionsResult = await ContributionService.getContributions(supabase, {
      userId: user.id,
      isAdmin: false,
      limit: 1000, // Get all contributions for stats
      page: 1,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc'
    })

    const contributions = contributionsResult.contributions || []

    // Calculate statistics from contributions
    let stats = {
      totalContributions: 0,
      totalAmount: 0,
      activeCases: 0,
      completedCases: 0,
      averageContribution: 0,
      lastContribution: null as string | null,
      latestContribution: null as {
        id: string
        amount: number | null
        created_at: string
        case_id: string | null
        status: string
        caseTitle?: string
        caseTitleAr?: string
      } | null
    }

    if (contributions && contributions.length > 0) {
      // Helper function to safely parse amount
      const parseAmount = (amount: unknown): number => {
        if (amount === null || amount === undefined) return 0
        if (typeof amount === 'string') {
          const parsed = parseFloat(amount)
          return isNaN(parsed) ? 0 : parsed
        }
        if (typeof amount === 'number') return isNaN(amount) ? 0 : amount
        return 0
      }

      const totalAmount = contributions.reduce((sum, c) => sum + parseAmount(c.amount), 0)
      
      // Get unique cases and their statuses from normalized contributions
      const uniqueCases = new Map<string, { status: string }>()
      contributions.forEach((c) => {
        if (c.caseId && !uniqueCases.has(c.caseId)) {
          // Normalized contributions have caseStatus
          const caseStatus = (c as any).caseStatus || 'published'
          uniqueCases.set(c.caseId, { status: caseStatus })
        }
      })
      
      const activeCases = Array.from(uniqueCases.values()).filter((c) => c.status === 'published').length
      const completedCases = Array.from(uniqueCases.values()).filter((c) => c.status === 'closed').length
      const lastContribution = contributions[0]?.createdAt || null

      // Get latest contribution (already normalized)
      const latestContributionData = contributions[0]
      const normalizedLatestContribution = latestContributionData ? {
        id: latestContributionData.id,
        amount: parseAmount(latestContributionData.amount),
        created_at: latestContributionData.createdAt || latestContributionData.created_at,
        case_id: latestContributionData.caseId || latestContributionData.case_id || null,
        status: latestContributionData.status,
        caseTitle: (latestContributionData as any).caseTitle,
        caseTitleAr: (latestContributionData as any).caseTitleAr
      } : null

      stats = {
        totalContributions: contributions.length,
        totalAmount,
        activeCases,
        completedCases,
        averageContribution: contributions.length > 0 ? totalAmount / contributions.length : 0,
        lastContribution,
        latestContribution: normalizedLatestContribution
      }
    }

    return NextResponse.json({
      user: userProfile,
      stats
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in profile stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { requireAuth: true, loggerContext: 'api/profile/stats' })
