import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auditService, extractRequestInfo } from '@/lib/services/auditService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const body = await request.json()
    const { userId, roleIds } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    logger.info('Assigning roles to user:', userId)
    logger.info('New roles:', roleIds)

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, get existing roles for audit logging
    const { data: existingRoles } = await adminClient
      .from('rbac_user_roles')
      .select(`
        id,
        role_id,
        rbac_roles!inner (name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    // Remove all existing roles for this user
    const { error: deleteError } = await adminClient
      .from('rbac_user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing existing user roles:', deleteError)
      throw deleteError
    }

    // Get current user for audit logging
    const { ipAddress, userAgent } = extractRequestInfo(request)
    // Use 'system' as default since we don't have easy access to the current user in this context
    const currentUserId = 'system'

    // Log role revocations
    if (existingRoles) {
      for (const role of existingRoles) {
        const roleData = Array.isArray(role.rbac_roles) ? role.rbac_roles[0] : role.rbac_roles
        await auditService.logRBACAction(
          currentUserId,
          'revoke_role',
          userId,
          role.role_id,
          undefined,
          {
            role_name: roleData?.name || 'unknown',
            request_id: request.headers.get('x-request-id')
          },
          ipAddress,
          userAgent
        )
      }
    }

    logger.info('Removed existing user roles')

    // Then, add the new roles
    if (roleIds && roleIds.length > 0) {
      const userRoles = roleIds.map((roleId: string) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: null, // We don't have the current user context here
        is_active: true
      }))

      const { error: insertError } = await adminClient
        .from('user_roles')
        .insert(userRoles)

      if (insertError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error inserting new user roles:', insertError)
        throw insertError
      }

      // Log role assignments
      // Get role names for logging
      const { data: rolesData } = await adminClient
        .from('rbac_roles')
        .select('id, name')
        .in('id', roleIds)

      if (rolesData) {
        for (const role of rolesData) {
          await auditService.logRBACAction(
            currentUserId,
            'assign_role',
            userId,
            role.id,
            undefined,
            {
              role_name: role.name,
              request_id: request.headers.get('x-request-id')
            },
            ipAddress,
            userAgent
          )
        }
      }

      logger.info('Added new user roles:', roleIds.length)
    }

    return NextResponse.json({
      success: true,
      message: 'User roles updated successfully'
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Assign user roles API error:', error)
    return NextResponse.json({
      error: 'Failed to assign user roles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
