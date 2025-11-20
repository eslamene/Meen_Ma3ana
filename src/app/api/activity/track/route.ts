/**
 * Activity Tracking API Endpoint
 * POST /api/activity/track
 * Tracks activities from client-side
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService, extractRequestInfo } from '@/lib/services/activityService'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const body = await request.json()
    const { ipAddress, userAgent } = extractRequestInfo(request)

    // Get user if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Use user_id from body or from auth
    const userId = body.user_id || user?.id

    // Log the activity based on type
    switch (body.activity_type) {
      case 'page_view':
        await ActivityService.logPageView({
          user_id: userId,
          session_id: body.session_id,
          path: body.resource_path || '',
          referer: request.headers.get('referer') || undefined,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: body.metadata,
        })
        break

      case 'user_action':
        await ActivityService.logUserAction({
          user_id: userId,
          session_id: body.session_id,
          action: body.action,
          resource_type: body.resource_type,
          resource_id: body.resource_id,
          resource_path: body.resource_path,
          category: body.category,
          details: body.details,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: body.metadata,
        })
        break

      case 'data_change':
        await ActivityService.logDataChange({
          user_id: userId,
          session_id: body.session_id,
          action: body.action,
          resource_type: body.resource_type,
          resource_id: body.resource_id,
          old_values: body.old_values,
          new_values: body.new_values,
          details: body.details,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: body.metadata,
        })
        break

      case 'auth_event':
        await ActivityService.logAuthEvent({
          user_id: userId,
          session_id: body.session_id,
          action: body.action,
          success: body.success !== false,
          details: body.details,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: body.metadata,
        })
        break

      case 'error':
        await ActivityService.logError({
          user_id: userId,
          session_id: body.session_id,
          action: body.action,
          error: body.error || 'Unknown error',
          resource_type: body.resource_type,
          resource_path: body.resource_path,
          details: body.details,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: body.metadata,
          severity: body.severity,
        })
        break

      default:
        logger.warn('Unknown activity type:', { activity_type: body.activity_type })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error tracking activity:', error)
    return NextResponse.json(
      { error: 'Failed to track activity' },
      { status: 500 }
    )
  }
}

