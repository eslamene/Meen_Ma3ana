/**
 * Admin Permissions API Route
 * GET /api/admin/permissions - Get all permissions
 * POST /api/admin/permissions - Create a permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  const permissions = await adminService.getPermissions()
  return NextResponse.json({ permissions })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()
    const { name, display_name, display_name_ar, description, description_ar, resource, action } = body

    if (!name || !display_name || !resource || !action) {
      throw new ApiError('VALIDATION_ERROR', 'Name, display_name, resource, and action are required', 400)
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .insert({
        name,
        display_name,
        display_name_ar,
        description,
        description_ar,
        resource,
        action,
        is_system: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ permission: data })
}

export const GET = createGetHandler(getHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/permissions' })
export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/permissions' })
