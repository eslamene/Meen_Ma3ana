import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { LegacyRolePermissionService } from '@/lib/services/legacyRolePermissionService'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('roleId')

  if (!roleId) {
    throw new ApiError('VALIDATION_ERROR', 'Role ID required', 400)
  }

    logger.info('Fetching permissions for role:', roleId)

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

    let role: Record<string, unknown>
    try {
      role = await LegacyRolePermissionService.getRoleWithPermissions(adminClient, roleId)
    } catch (e) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching role:', e)
      throw new ApiError('INTERNAL_SERVER_ERROR', e instanceof Error ? e.message : 'Failed to fetch role', 500)
    }

    logger.info('Role fetched successfully:', (role as { name?: string }).name)
    const rp = role.role_permissions as unknown[] | undefined
    logger.info('Permissions count:', rp?.length || 0)

    return NextResponse.json({
      success: true,
      role: role
    })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/role-permissions' })
