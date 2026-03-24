import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createGetHandler } from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import type { ApiResponse } from '@/types/api'

interface DashboardStats {
  totalContributions: number
  totalAmount: number
  activeCases: number
  completedCases: number
}

export const GET = createGetHandler(
  async (request, { user, supabase, logger }) => {
    try {
      const { ContributionService } = await import('@/lib/services/contributionService')

      // Fetch user's contributions
      const contributionsResult = await ContributionService.getContributions(supabase, {
        userId: user.id,
        isAdmin: false,
        limit: 1000, // Get all for stats
        page: 1,
        offset: 0
      })

      const contributions = contributionsResult.contributions || []

      // Fetch user's cases (CaseService doesn't support createdBy filter yet, so query directly)
      // TODO: Add createdBy parameter to CaseService.getCases()
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('status')
        .eq('created_by', user.id)

      if (casesError) {
        logger.error('Error fetching cases', { 
          error: casesError,
          errorCode: casesError.code,
          errorMessage: casesError.message,
          userId: user.id
        })
        throw createApiError.internalError('Failed to fetch cases')
      }

      // Log for debugging
      logger.debug('Dashboard stats fetched', {
        contributionsCount: contributions.length,
        casesCount: cases.length,
        userId: user.id
      })

      // Calculate statistics
      const totalContributions = contributions.length
      const totalAmount = contributions.reduce((sum, c) => {
        const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
        return sum + amount
      }, 0)
      const activeCases = cases.filter((c) => c.status === 'active' || c.status === 'published').length
      const completedCases = cases.filter((c) => c.status === 'completed' || c.status === 'closed').length

      return NextResponse.json({
        data: {
          stats: {
            totalContributions,
            totalAmount,
            activeCases,
            completedCases
          }
        }
      })
    } catch (error) {
      logger.error('Error fetching dashboard stats', { 
        error,
        userId: user.id
      })
      throw createApiError.internalError('Failed to fetch dashboard stats')
    }
  },
  { requireAuth: true, loggerContext: 'api/dashboard/stats' }
)

