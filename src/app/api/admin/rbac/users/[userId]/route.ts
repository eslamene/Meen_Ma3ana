import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * DELETE /api/admin/rbac/users/[userId]
 * Remove all roles from a user
 */
export async function DELETE(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (roleError) {
      return NextResponse.json({ error: 'Failed to check user permissions' }, { status: 500 })
    }

    const hasAdminRole = userRoles?.some((ur: any) => 
      ur.rbac_roles?.name === 'admin' || ur.rbac_roles?.name === 'super_admin'
    )

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Remove all role assignments for this user
    const { error: deleteError } = await supabase
      .from('rbac_user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove user roles' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User roles removed successfully' 
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing user roles:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
