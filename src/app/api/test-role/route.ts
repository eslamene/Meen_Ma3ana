import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/rbac/types'
import { isTestEnabled, requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'

export async function POST(request: NextRequest) {
  try {
    // Check if test endpoints are enabled
    if (!isTestEnabled()) {
      return NextResponse.json({
        success: false,
        message: 'Test endpoints are disabled'
      }, { status: 404 })
    }

    const { role, targetUserId } = await request.json()
    
    if (!role || !['donor', 'sponsor', 'admin'].includes(role)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid role. Must be donor, sponsor, or admin.'
      }, { status: 400 })
    }

    // Require admin permission for role changes
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

    // Log the role change attempt
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logRBACAction(
      adminUser.id,
      'test_role_change',
      targetUserId || adminUser.id,
      undefined,
      undefined,
      { 
        newRole: role,
        endpoint: '/api/test-role',
        isSelfChange: !targetUserId || targetUserId === adminUser.id
      },
      ipAddress,
      userAgent
    )

    // Prevent users from changing their own role
    if (!targetUserId || targetUserId === adminUser.id) {
      return NextResponse.json({
        success: false,
        message: 'Admins cannot change their own role through this endpoint. Use RBAC management instead.'
      }, { status: 403 })
    }

    // Update target user metadata with new role
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role: role as UserRole }
    })

    if (updateError) {
      return NextResponse.json({
        success: false,
        message: `Failed to update role: ${updateError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role} for user ${targetUserId}`,
      role: role,
      targetUserId: targetUserId
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if test endpoints are enabled
    if (!isTestEnabled()) {
      return NextResponse.json({
        success: false,
        message: 'Test endpoints are disabled'
      }, { status: 404 })
    }

    // Require admin permission to view role information
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    const currentRole = user.user_metadata?.role || 'donor'

    return NextResponse.json({
      success: true,
      role: currentRole,
      user: {
        id: user.id,
        email: user.email,
        role: currentRole
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
} 