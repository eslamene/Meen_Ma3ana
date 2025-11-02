import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const body = await request.json()
    const { roleId, permissionIds } = body

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 })
    }

    logger.info('Updating permissions for role:', roleId)
    logger.info('New permissions:', permissionIds)

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, remove all existing permissions for this role
    const { error: deleteError } = await adminClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing existing permissions:', deleteError)
      throw deleteError
    }

    logger.info('Removed existing permissions')

    // Then, add the new permissions
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((permissionId: string) => ({
        role_id: roleId,
        permission_id: permissionId
      }))

      const { error: insertError } = await adminClient
        .from('role_permissions')
        .insert(rolePermissions)

      if (insertError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error inserting new permissions:', insertError)
        throw insertError
      }

      logger.info('Added new permissions:', permissionIds.length)
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully'
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Update role permissions API error:', error)
    return NextResponse.json({
      error: 'Failed to update role permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
