import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * POST /api/admin/users/[userId]/reset-password
 * Reset user password (admin-initiated)
 * 
 * This sends a password reset email to the user
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<{ userId: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { userId } = await context.params
    
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
      'admin_password_reset',
      'user',
      userId,
      {},
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

    // Get user email
    const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId)
    
    if (authError || !authUser || !authUser.user.email) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get locale from request or default to 'en'
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'en'

    // Send password reset email
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/auth/reset-password`
    
    const { error: resetError } = await serviceRoleClient.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
      options: {
        redirectTo
      }
    })

    if (resetError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error generating password reset link:', resetError)
      return NextResponse.json(
        { error: 'Failed to send password reset email', details: resetError.message },
        { status: 500 }
      )
    }

    // Note: generateLink doesn't actually send the email, we need to use resetPasswordForEmail
    // But that requires the anon key. Let's use the service role to send it.
    const { error: emailError } = await serviceRoleClient.auth.resetPasswordForEmail(
      authUser.user.email,
      {
        redirectTo
      }
    )

    if (emailError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending password reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send password reset email', details: emailError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Password reset API error:', error)
    return NextResponse.json({
      error: 'Failed to reset password',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

