import { NextRequest, NextResponse } from 'next/server'
import {
  createGetHandlerWithParams,
  createPutHandlerWithParams,
  createDeleteHandlerWithParams,
} from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import { CategoryService } from '@/lib/services/categoryService'

export const GET = createGetHandlerWithParams(
  async (_request: NextRequest, { supabase, logger }, params: { id: string }) => {
    try {
      const category = await CategoryService.getById(supabase, params.id)
      if (!category) {
        throw createApiError.notFound('Category not found')
      }
      return NextResponse.json({ category })
    } catch (error) {
      if (error instanceof Error && 'statusCode' in (error as any)) {
        throw error
      }
      logger.error('Error fetching category by id', error, {
        area: 'categories',
        operation: 'GET /api/categories/[id]',
        categoryId: params.id,
      })
      throw createApiError.internalError('Failed to fetch category')
    }
  },
  { requireAuth: false, loggerContext: 'api/categories/[id]' }
)

export const PUT = createPutHandlerWithParams(
  async (request: NextRequest, { supabase, logger }, params: { id: string }) => {
    try {
      const body = await request.json()
      const category = await CategoryService.update(supabase, params.id, body)
      return NextResponse.json({ category })
    } catch (error) {
      logger.error('Error updating category', error, {
        area: 'categories',
        operation: 'PUT /api/categories/[id]',
        categoryId: params.id,
      })
      if (error instanceof Error && error.message.includes('already exists')) {
        throw createApiError.validationError(error.message)
      }
      throw createApiError.internalError('Failed to update category')
    }
  },
  { requireAdmin: true, loggerContext: 'api/categories/[id]' }
)

export const DELETE = createDeleteHandlerWithParams(
  async (_request: NextRequest, { supabase, logger }, params: { id: string }) => {
    try {
      await CategoryService.delete(supabase, params.id, true)
      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('Error deleting category', error, {
        area: 'categories',
        operation: 'DELETE /api/categories/[id]',
        categoryId: params.id,
      })
      if (error instanceof Error && error.message.includes('Cannot delete category')) {
        throw createApiError.validationError(error.message)
      }
      throw createApiError.internalError('Failed to delete category')
    }
  },
  { requireAdmin: true, loggerContext: 'api/categories/[id]' }
)

