import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler } from '@/lib/utils/api-wrapper'
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
      // Use direct lightweight queries for dashboard stats to avoid
      // dependency on complex contribution search RPC/query joins.
      const { data: contributions, error: contributionsError } = await supabase
        .from('contributions')
        .select('amount')
        .eq('donor_id', user.id)

      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('status')
        .eq('created_by', user.id)

      if (contributionsError) {
        logger.error('Error fetching contributions for dashboard stats', contributionsError, {
          userId: user.id,
        })
        throw createApiError.internalError('Failed to fetch contributions')
      }

      if (casesError) {
        logger.error('Error fetching cases for dashboard stats', casesError, {
          userId: user.id,
        })
        throw createApiError.internalError('Failed to fetch cases')
      }

      // Log for debugging
      logger.debug('Dashboard stats fetched', {
        contributionsCount: contributions?.length ?? 0,
        casesCount: cases?.length ?? 0,
        userId: user.id,
      })

      // Calculate statistics
      const contributionRows = contributions || []
      const caseRows = cases || []
      const totalContributions = contributionRows.length
      const totalAmount = contributionRows.reduce((sum, c) => {
        const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
        return sum + amount
      }, 0)
      const activeCases = caseRows.filter((c) => c.status === 'active' || c.status === 'published').length
      const completedCases = caseRows.filter((c) => c.status === 'completed' || c.status === 'closed').length

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
      logger.error('Error fetching dashboard stats', error, {
        userId: user.id,
      })
      throw createApiError.internalError('Failed to fetch dashboard stats')
    }
  },
  { requireAuth: true, loggerContext: 'api/dashboard/stats' }
)

