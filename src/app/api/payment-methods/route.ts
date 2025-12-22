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

  let query = supabase
    .from('payment_methods')
    .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching payment methods', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch payment methods', 500)
  }

  return NextResponse.json({ paymentMethods: data || [] })
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

    // Validate required fields
    if (!code) {
      throw new ApiError('VALIDATION_ERROR', 'code is required', 400)
    }

    if (!name_en && !name) {
      throw new ApiError('VALIDATION_ERROR', 'name_en or name is required', 400)
    }

    // Check for duplicate code
    const { data: existingMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (existingMethod) {
      throw new ApiError('VALIDATION_ERROR', 'Payment method with this code already exists', 400)
    }

    // Use name_en if provided, otherwise use name
    const finalName = name_en || name
    const finalNameEn = name_en || name
    const finalNameAr = name_ar || null

    // Insert new payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        code,
        name: finalName,
        name_en: finalNameEn,
        name_ar: finalNameAr,
        description: description_en || description || null,
        description_en: description_en || description || null,
        description_ar: description_ar || null,
        icon: icon || null,
        sort_order: sort_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating payment method', { error: insertError })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create payment method', 500)
    }

    return NextResponse.json({ paymentMethod: newMethod }, { status: 201 })
}

export const GET = createGetHandler(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/payment-methods' 
})

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/payment-methods' 
}) 