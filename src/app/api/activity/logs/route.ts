/**
 * Activity Logs API Endpoint
 * GET /api/activity/logs
 * Query activity logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService, ActivityQueryParams } from '@/lib/services/activityService'
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

    // Check if user is admin (simplified check - you may want to use your permission system)
    const { data: userRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isAdmin = userRoles?.some((ur: any) => {
      const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
      return role?.name === 'admin' || role?.name === 'super_admin'
    })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams: ActivityQueryParams = {
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
      activity_type: searchParams.get('activity_type') as any,
      category: searchParams.get('category') as any,
      action: searchParams.get('action') || undefined,
      resource_type: searchParams.get('resource_type') || undefined,
      resource_id: searchParams.get('resource_id') || undefined,
      severity: searchParams.get('severity') as any,
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

