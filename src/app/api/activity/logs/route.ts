/**
 * Activity Logs API Endpoint
 * GET /api/activity/logs
 * Query activity logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService, ActivityQueryParams, type ActivityType, type ActivityCategory, type ActivitySeverity } from '@/lib/services/activityService'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  try {
    // Check if user is admin using AdminService
    const { adminService } = await import('@/lib/admin/service')
    const isAdmin = await adminService.hasAnyRole(user.id, ['admin', 'super_admin'])

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const activityTypeParam = searchParams.get('activity_type')
    const categoryParam = searchParams.get('category')
    const severityParam = searchParams.get('severity')
    
    const queryParams: ActivityQueryParams = {
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
      activity_type: activityTypeParam ? (activityTypeParam as ActivityType) : undefined,
      category: categoryParam ? (categoryParam as ActivityCategory) : undefined,
      action: searchParams.get('action') || undefined,
      resource_type: searchParams.get('resource_type') || undefined,
      resource_id: searchParams.get('resource_id') || undefined,
      severity: severityParam ? (severityParam as ActivitySeverity) : undefined,
      search: searchParams.get('search') || undefined,
    }

    // Handle user_id filtering (for visitor vs authenticated filtering)
    const userIdParam = searchParams.get('user_id')
    if (userIdParam === 'null') {
      // Filter for visitors only (user_id IS NULL)
      queryParams.user_id = 'null'
    } else if (userIdParam === 'not_null') {
      // Filter for authenticated users only (user_id IS NOT NULL)
      queryParams.user_id = 'not_null'
    } else if (userIdParam) {
      queryParams.user_id = userIdParam
    }

    // Parse date filters
    if (searchParams.get('start_date')) {
      queryParams.start_date = new Date(searchParams.get('start_date')!)
    }
    if (searchParams.get('end_date')) {
      queryParams.end_date = new Date(searchParams.get('end_date')!)
    }

    // If not admin, only show user's own logs
    if (!isAdmin) {
      queryParams.user_id = user.id
    }

    const { logs, total } = await ActivityService.getActivityLogs(queryParams)

    return NextResponse.json({
      logs,
      count: logs.length,
      total,
      limit: queryParams.limit,
      offset: queryParams.offset,
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error getting activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to get activity logs' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/activity/logs' })