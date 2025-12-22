import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGetHandlerWithParams, createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

    const { data: category, error } = await supabase
      .from('case_categories')
      .select('id, name, name_en, name_ar, description, description_en, description_ar, icon, color, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching category:', error)
      throw new ApiError('NOT_FOUND', 'Category not found', 404)
    }

    return NextResponse.json({ category })
}

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const body = await request.json()
    const {
      name,
      name_en,
      name_ar,
      description,
      description_en,
      description_ar,
      icon,
      color,
      is_active
    } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name_en !== undefined) {
      updateData.name_en = name_en
      updateData.name = name_en // Keep name for backward compatibility
    } else if (name !== undefined) {
      updateData.name = name
      updateData.name_en = name_en || name
    }

    if (name_ar !== undefined) updateData.name_ar = name_ar
    if (description_en !== undefined) {
      updateData.description_en = description_en
      updateData.description = description_en // Keep description for backward compatibility
    } else if (description !== undefined) {
      updateData.description = description
      updateData.description_en = description_en || description
    }
    if (description_ar !== undefined) updateData.description_ar = description_ar
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (is_active !== undefined) updateData.is_active = is_active

    // Check for duplicate name_en if name is being changed
    if (updateData.name_en) {
      const { data: existingCategory } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name_en', updateData.name_en)
        .neq('id', id)
        .maybeSingle()

      if (existingCategory) {
        throw new ApiError('VALIDATION_ERROR', 'Category with this name already exists', 400)
      }
    }

    const { data: updatedCategory, error: updateError } = await supabase
      .from('case_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating category:', updateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update category', 500)
    }

    return NextResponse.json({ category: updatedCategory })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    // Check if category is used by any cases
    const { data: casesUsingCategory, error: casesError } = await supabase
      .from('cases')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (casesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking category usage:', casesError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to check category usage', 500)
    }

    if (casesUsingCategory && casesUsingCategory.length > 0) {
      throw new ApiError('VALIDATION_ERROR', 'Cannot delete category: It is being used by one or more cases. Deactivate it instead.', 400)
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('case_categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting category:', deleteError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete category', 500)
    }

    return NextResponse.json({ message: 'Category deleted successfully' })
}

export const GET = createGetHandlerWithParams<{ id: string }>(getHandler, { loggerContext: 'api/categories/[id]' })
export const PATCH = createPutHandlerWithParams<{ id: string }>(patchHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/categories/[id]' })
export const DELETE = createDeleteHandlerWithParams<{ id: string }>(deleteHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/categories/[id]' })





