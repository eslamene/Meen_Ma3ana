import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('roleId')

  if (!roleId) {
    throw new ApiError('VALIDATION_ERROR', 'Role ID required', 400)
  }

    logger.info('Fetching permissions for role:', roleId)

    // Create admin client
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }
    
    const adminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch role with permissions
    const { data: role, error: roleError } = await adminClient
      .from('roles')
      .select(`
        *,
        role_permissions(
          permissions(*)
        )
      `)
      .eq('id', roleId)
      .single()

    if (roleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching role:', roleError)
      throw roleError
    }

    logger.info('Role fetched successfully:', role.name)
    logger.info('Permissions count:', role.role_permissions?.length || 0)

    return NextResponse.json({
      success: true,
      role: role
    })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/role-permissions' })
