/**
 * Admin Role API Route - Update Role
 * PUT /api/admin/roles/[id] - Update a role
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { createPutHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const body = await request.json()
    const { display_name, display_name_ar, description, description_ar, level } = body

    // SECURITY: Check if role is system role (can't update system roles)
    const { data: existingRole } = await supabase
      .from('admin_roles')
      .select('is_system, name')
      .eq('id', params.id)
      .single()

    if (existingRole?.is_system) {
      throw new ApiError('VALIDATION_ERROR', 'Cannot update system roles', 400)
    }

    const { data, error } = await supabase
      .from('admin_roles')
      .update({
        display_name,
        display_name_ar,
        description,
        description_ar,
        level: level !== undefined ? level : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ role: data })
}

export const PUT = createPutHandlerWithParams<{ id: string }>(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/roles/[id]' })

