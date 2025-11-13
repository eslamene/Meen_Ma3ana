import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * POST /api/admin/users/merge
 * Merge two user accounts
 * 
 * This will:
 * 1. Reassign all contributions from source user to target user
 * 2. Reassign all notifications from source user to target user
 * 3. Optionally delete the source user account
 */
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const body = await request.json()
    const { fromUserId, toUserId, deleteSource = false } = body

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { error: 'fromUserId and toUserId are required' },
        { status: 400 }
      )
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: 'Cannot merge user with itself' },
        { status: 400 }
      )
    }

    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_merge',
      'user',
      fromUserId,
      { target_user_id: toUserId, delete_source: deleteSource },
      ipAddress,
      userAgent
    )

    // Create service role client for admin operations
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify users exist
    const { data: fromUser, error: fromError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', fromUserId)
      .single()

    if (fromError || !fromUser) {
      return NextResponse.json(
        { error: 'Source user not found' },
        { status: 404 }
      )
    }

    const { data: toUser, error: toError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', toUserId)
      .single()

    if (toError || !toUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Get contribution counts
    const { count: fromContribCount } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', fromUserId)

    const { count: toContribCount } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', toUserId)

    // Step 1: Reassign contributions
    const { error: contribError } = await supabase
      .from('contributions')
      .update({ donor_id: toUserId, updated_at: new Date().toISOString() })
      .eq('donor_id', fromUserId)

    if (contribError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning contributions:', contribError)
      return NextResponse.json(
        { error: 'Failed to reassign contributions', details: contribError.message },
        { status: 500 }
      )
    }

    // Step 2: Reassign notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .update({ recipient_id: toUserId, updated_at: new Date().toISOString() })
      .eq('recipient_id', fromUserId)

    if (notifError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning notifications:', notifError)
      // Don't fail, notifications are less critical
    }

    // Step 3: Reassign recurring contributions if they exist
    const { error: recurringError } = await supabase
      .from('recurring_contributions')
      .update({ donor_id: toUserId, updated_at: new Date().toISOString() })
      .eq('donor_id', fromUserId)

    if (recurringError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning recurring contributions:', recurringError)
      // Don't fail, continue
    }

    // Step 4: Reassign sponsorships if they exist
    const { error: sponsorshipError } = await supabase
      .from('sponsorships')
      .update({ sponsor_id: toUserId, updated_at: new Date().toISOString() })
      .eq('sponsor_id', fromUserId)

    if (sponsorshipError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning sponsorships:', sponsorshipError)
      // Don't fail, continue
    }

    // Step 5: Optionally delete source user
    if (deleteSource) {
      // Delete from users table (cascades should handle related data)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', fromUserId)

      if (deleteError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting source user:', deleteError)
        // Don't fail, user might have admin roles or other constraints
      } else {
        // Also delete from auth if possible
        try {
          await serviceRoleClient.auth.admin.deleteUser(fromUserId)
        } catch (authDeleteError) {
          logger.warn('Could not delete auth user:', authDeleteError)
          // Continue, user record is deleted from users table
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged accounts. ${fromContribCount || 0} contributions reassigned.`,
      stats: {
        contributions_reassigned: fromContribCount || 0,
        target_user_total_contributions: (toContribCount || 0) + (fromContribCount || 0),
        source_user_deleted: deleteSource
      }
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Account merge API error:', error)
    return NextResponse.json({
      error: 'Failed to merge accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

