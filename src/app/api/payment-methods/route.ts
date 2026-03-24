import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { supabase, logger } = context
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const { PaymentMethodService } = await import('@/lib/services/paymentMethodService')
    const paymentMethods = await PaymentMethodService.getAll(supabase, includeInactive)
    return NextResponse.json({ paymentMethods })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching payment methods:', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch payment methods', 500)
  }
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { supabase, logger } = context

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
    sort_order = 0,
    is_active = true
  } = body

  try {
    const { PaymentMethodService } = await import('@/lib/services/paymentMethodService')
    
    const newMethod = await PaymentMethodService.create(supabase, {
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

    return NextResponse.json({ paymentMethod: newMethod }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        throw new ApiError('VALIDATION_ERROR', error.message, 400)
      }
      if (error.message.includes('required')) {
        throw new ApiError('VALIDATION_ERROR', error.message, 400)
      }
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating payment method:', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to create payment method', 500)
  }
}

export const GET = createGetHandler(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/payment-methods' 
})

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/payment-methods' 
}) 