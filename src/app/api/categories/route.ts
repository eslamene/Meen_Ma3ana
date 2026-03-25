import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler } from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'
import { CategoryService } from '@/lib/services/categoryService'

export const GET = createGetHandler(
  async (request: NextRequest, { supabase, logger }) => {
    try {
      const { searchParams } = new URL(request.url)
      const includeInactive = searchParams.get('includeInactive') === 'true'
      const categories = await CategoryService.getAll(supabase, includeInactive)
      return NextResponse.json({ categories })
    } catch (error) {
      logger.error('Error fetching categories', error, {
        area: 'categories',
        operation: 'GET /api/categories',
      })
      throw createApiError.internalError('Failed to fetch categories')
    }
  },
  { requireAuth: false, loggerContext: 'api/categories' }
)

export const POST = createPostHandler(
  async (request: NextRequest, { supabase, logger }) => {
    try {
      const body = await request.json()
      const category = await CategoryService.create(supabase, body)
      return NextResponse.json({ category }, { status: 201 })
    } catch (error) {
      logger.error('Error creating category', error, {
        area: 'categories',
        operation: 'POST /api/categories',
      })
      if (error instanceof Error && error.message.includes('already exists')) {
        throw createApiError.validationError(error.message)
      }
      throw createApiError.internalError('Failed to create category')
    }
  },
  { requireAdmin: true, loggerContext: 'api/categories' }
)

