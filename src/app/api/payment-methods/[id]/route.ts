import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, createPatchHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  const { data: paymentMethod, error } = await supabase
    .from('payment_methods')
    .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError('NOT_FOUND', 'Payment method not found', 404)
    }
    logger.error('Error fetching payment method', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch payment method', 500)
  }

  return NextResponse.json({ paymentMethod })
}

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

    const body = await request.json()
    const {
      code,
      name,
      name_en,
      name_ar,
      description,
      description_en,
      description_ar,
      icon,
      sort_order,
      is_active
    } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (name_en !== undefined) updateData.name_en = name_en
    if (name_ar !== undefined) updateData.name_ar = name_ar
    if (description !== undefined) updateData.description = description
    if (description_en !== undefined) updateData.description_en = description_en
    if (description_ar !== undefined) updateData.description_ar = description_ar
    if (icon !== undefined) updateData.icon = icon
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_active !== undefined) updateData.is_active = is_active

    // If code is being updated, check for duplicates
    if (code !== undefined) {
      const { data: existingMethod } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('code', code)
        .neq('id', params.id)
        .maybeSingle()

      if (existingMethod) {
        throw new ApiError('VALIDATION_ERROR', 'Payment method with this code already exists', 400)
      }
    }

    const { data: updatedMethod, error: updateError } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating payment method', { error: updateError })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update payment method', 500)
    }

    return NextResponse.json({ paymentMethod: updatedMethod })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

    // Check if payment method is used in contributions
    const { data: contributions, error: checkError } = await supabase
      .from('contributions')
      .select('id')
      .eq('payment_method_id', id)
      .limit(1)

    if (checkError) {
      logger.error('Error checking payment method usage', { error: checkError })
    }

    if (contributions && contributions.length > 0) {
      throw new ApiError('VALIDATION_ERROR', 'Cannot delete payment method that is in use. Deactivate it instead.', 400)
    }

    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting payment method', { error: deleteError })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete payment method', 500)
    }

    return NextResponse.json({ success: true })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/payment-methods/[id]' 
})

export const PATCH = createPatchHandlerWithParams(patchHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/payment-methods/[id]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/payment-methods/[id]' 
})

