/**
 * Admin Menu Reorder API Route
 * PUT /api/admin/menu/reorder - Bulk update menu item sort orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPutHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const body = await request.json()
  const { items } = body // Array of { id, sort_order }

  if (!Array.isArray(items)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400)
  }

  // Update all items
  const updates = await Promise.all(
    items.map((item: { id: string; sort_order: number }) =>
      supabase
        .from('admin_menu_items')
        .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single()
    )
  )

  // Check for errors
  const errors = updates.filter(result => result.error)
  if (errors.length > 0) {
    logger.error('Error updating menu items:', errors)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Some items failed to update', 500)
  }

  return NextResponse.json({ success: true })
}

export const PUT = createPutHandler(handler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/menu/reorder' })

