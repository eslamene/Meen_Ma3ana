/**
 * Clean Administration API Routes
 * API endpoints for managing roles, permissions, and user access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { RoleService } from '@/lib/services/roleService'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const rolesWithCounts = await RoleService.listActiveWithPermissionsAndUserCounts(supabase)

  logger.info('Roles fetched with counts:', {
    totalRoles: rolesWithCounts.length,
    rolesWithPermissions: rolesWithCounts.filter((r) => r.permissions_count > 0).length,
    rolesWithUsers: rolesWithCounts.filter((r) => r.users_count > 0).length
  })

  return NextResponse.json({ roles: rolesWithCounts })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase } = context

  const body = await request.json()
  const { name, display_name, display_name_ar, description, description_ar, level } = body

  if (!name || !display_name) {
    throw new ApiError('VALIDATION_ERROR', 'Name and display_name are required', 400)
  }

  const data = await RoleService.create(supabase, {
    name,
    display_name,
    display_name_ar,
    description,
    description_ar,
    level: level ?? 0
  })

  return NextResponse.json({ role: data })
}

export const GET = createGetHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles' })
export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles' })
