import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { LegacyRolePermissionService } from '@/lib/services/legacyRolePermissionService'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const body = await request.json()
  const { roleId, permissionIds } = body

  if (!roleId) {
    throw new ApiError('VALIDATION_ERROR', 'Role ID required', 400)
  }

  logger.info('Updating permissions for role:', roleId)
  logger.info('New permissions:', permissionIds)

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    await LegacyRolePermissionService.replaceRolePermissions(adminClient, roleId, permissionIds)
  } catch (e) {
    logger.error('Error updating role permissions:', e)
    throw new ApiError('INTERNAL_SERVER_ERROR', e instanceof Error ? e.message : 'Update failed', 500)
  }

  logger.info('Role permissions updated')

  return NextResponse.json({
    success: true,
    message: 'Role permissions updated successfully'
  })
}

export const POST = createPostHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/update-role-permissions' })
