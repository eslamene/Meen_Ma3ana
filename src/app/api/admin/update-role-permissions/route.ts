import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const body = await request.json()
  const { roleId, permissionIds } = body

  if (!roleId) {
    throw new ApiError('VALIDATION_ERROR', 'Role ID required', 400)
  }

  logger.info('Updating permissions for role:', roleId)
  logger.info('New permissions:', permissionIds)

  // Create admin client
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }
  
  const adminClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  // First, remove all existing permissions for this role
  const { error: deleteError } = await adminClient
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) {
    logger.error('Error removing existing permissions:', deleteError)
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
      logger.error('Error inserting new permissions:', insertError)
      throw insertError
    }

    logger.info('Added new permissions:', permissionIds.length)
  }

  return NextResponse.json({
    success: true,
    message: 'Role permissions updated successfully'
  })
}

export const POST = createPostHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/update-role-permissions' })
