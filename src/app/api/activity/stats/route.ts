/**
 * Activity Statistics API Endpoint
 * GET /api/activity/stats
 * Get activity statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/services/activityService'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const groupBy = (searchParams.get('group_by') || 'day') as 'hour' | 'day' | 'week' | 'month'
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined

    const stats = await ActivityService.getActivityStats({
      start_date: startDate,
      end_date: endDate,
      group_by: groupBy,
    })

    return NextResponse.json({
      stats,
      group_by: groupBy,
      start_date: startDate?.toISOString(),
      end_date: endDate?.toISOString(),
    })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/activity/stats' })

