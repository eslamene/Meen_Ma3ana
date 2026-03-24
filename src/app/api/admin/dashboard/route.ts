import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler } from '@/lib/utils/api-wrapper'

export const GET = createGetHandler(
  async (request, { supabase, logger }) => {
    try {
      const { StatsService } = await import('@/lib/services/statsService')
      const stats = await StatsService.getDashboardStats(supabase)

      logger.info('Dashboard stats calculated', {
        totalUsers: stats.totalUsers,
        totalContributions: stats.totalContributions,
        totalAmount: stats.totalAmount,
        activeCases: stats.activeCases,
        completedCases: stats.completedCases
      })

      return NextResponse.json({
        data: stats
      })
    } catch (error) {
      logger.error('Error calculating dashboard stats:', { error })
      throw error
    }
  },
  { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/dashboard' }
)

