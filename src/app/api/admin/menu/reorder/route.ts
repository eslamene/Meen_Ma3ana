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

  const { MenuService } = await import('@/lib/services/menuService')

  try {
    await MenuService.reorder(supabase, items)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error reordering menu items:', { error })
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message, 500)
    }
    throw error
  }
}

export const PUT = createPutHandler(handler, { requireAuth: true, requireSuperAdmin: true, loggerContext: 'api/admin/menu/reorder' })

