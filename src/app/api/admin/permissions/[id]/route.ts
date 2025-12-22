/**
 * Admin Permission API Route - Create/Update/Delete
 * POST /api/admin/permissions - Create permission
 * PUT /api/admin/permissions/[id] - Update permission
 * DELETE /api/admin/permissions/[id] - Delete permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

  const body = await request.json()
  const { display_name, display_name_ar, description, description_ar } = body

  // Check if permission is system (can't update system permissions)
  const { data: existingPermission } = await supabase
    .from('admin_permissions')
    .select('is_system')
    .eq('id', id)
    .single()

  if (existingPermission?.is_system) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot update system permissions', 400)
  }

  const { data, error } = await supabase
    .from('admin_permissions')
    .update({
      display_name,
      display_name_ar,
      description,
      description_ar,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ permission: data })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

  // Check if permission is system (can't delete system permissions)
  const { data: existingPermission } = await supabase
    .from('admin_permissions')
    .select('is_system')
    .eq('id', id)
    .single()

  if (existingPermission?.is_system) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot delete system permissions', 400)
  }

  const { error } = await supabase
    .from('admin_permissions')
    .delete()
    .eq('id', id)

  if (error) throw error

  return NextResponse.json({ success: true })
}

export const PUT = createPutHandlerWithParams<{ id: string }>(putHandler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/permissions/[id]' })
export const DELETE = createDeleteHandlerWithParams<{ id: string }>(deleteHandler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/permissions/[id]' })

