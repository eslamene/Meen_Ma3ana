/**
 * Admin Role API Route - Update Role
 * PUT /api/admin/roles/[id] - Update a role
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { RoleService } from '@/lib/services/roleService'

async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase } = context
  const { id } = params

  const body = await request.json()
  const { display_name, display_name_ar, description, description_ar, level } = body

  const existingRole = await RoleService.getById(supabase, id)

  if (!existingRole) {
    throw new ApiError('NOT_FOUND', 'Role not found', 404)
  }

  if (existingRole.is_system) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot update system roles', 400)
  }

  const data = await RoleService.update(supabase, id, {
    display_name,
    display_name_ar,
    description,
    description_ar,
    level
  })

  return NextResponse.json({ role: data })
}

export const PUT = createPutHandlerWithParams<{ id: string }>(handler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/roles/[id]'
})
