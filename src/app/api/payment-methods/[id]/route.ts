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

  try {
    const { PaymentMethodService } = await import('@/lib/services/paymentMethodService')
    
    const paymentMethod = await PaymentMethodService.getById(supabase, id)
    
    if (!paymentMethod) {
      throw new ApiError('NOT_FOUND', 'Payment method not found', 404)
    }

    return NextResponse.json({ paymentMethod })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching payment method:', { error, paymentMethodId: id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch payment method', 500)
  }
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

  try {
    const { PaymentMethodService } = await import('@/lib/services/paymentMethodService')
    
    const updatedMethod = await PaymentMethodService.update(supabase, id, {
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
    })

    return NextResponse.json({ paymentMethod: updatedMethod })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        throw new ApiError('VALIDATION_ERROR', error.message, 400)
      }
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating payment method:', { error, paymentMethodId: id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to update payment method', 500)
  }
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  try {
    const { PaymentMethodService } = await import('@/lib/services/paymentMethodService')
    
    await PaymentMethodService.delete(supabase, id, true) // checkUsage = true
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('in use')) {
        throw new ApiError('VALIDATION_ERROR', error.message, 400)
      }
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting payment method:', { error, paymentMethodId: id })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to delete payment method', 500)
  }
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

