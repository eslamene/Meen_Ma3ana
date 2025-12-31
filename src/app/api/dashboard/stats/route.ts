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

    // Fetch user's contributions
    // RLS policies will automatically filter to user's own contributions
    // We still add the filter for clarity and performance
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('amount, status')
      .eq('donor_id', user.id)

    if (contributionsError) {
      logger.error('Error fetching contributions', { 
        error: contributionsError,
        errorCode: contributionsError.code,
        errorMessage: contributionsError.message,
        userId: user.id
      })
      throw createApiError.internalError('Failed to fetch contributions')
    }

    // Fetch user's cases
    // RLS policies will automatically filter to user's own cases
    // We still add the filter for clarity and performance
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

    // Log for debugging (can be removed later)
    logger.debug('Dashboard stats fetched', {
      contributionsCount: contributions?.length || 0,
      casesCount: cases?.length || 0,
      userId: user.id
    })

    // Calculate statistics
    const totalContributions = contributions?.length || 0
    const totalAmount = (contributions || []).reduce((sum, c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
      return sum + amount
    }, 0)
    const activeCases = (cases || []).filter((c) => c.status === 'active' || c.status === 'published').length
    const completedCases = (cases || []).filter((c) => c.status === 'completed' || c.status === 'closed').length

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
  },
  { requireAuth: true, loggerContext: 'api/dashboard/stats' }
)

