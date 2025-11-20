/**
 * Activity Statistics API Endpoint
 * GET /api/activity/stats
 * Get activity statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/services/activityService'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check authentication and admin permissions
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isAdmin = userRoles?.some((ur: any) => {
      const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
      return role?.name === 'admin' || role?.name === 'super_admin'
    })

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error getting activity stats:', error)
    return NextResponse.json(
      { error: 'Failed to get activity statistics' },
      { status: 500 }
    )
  }
}

