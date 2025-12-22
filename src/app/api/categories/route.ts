import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('case_categories')
      .select('id, name, name_en, name_ar, description, description_en, description_ar, icon, color, is_active, created_at, updated_at')
      .order('name_en', { ascending: true, nullsFirst: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching categories:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch categories', 500)
    }

    return NextResponse.json({ categories: data || [] })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

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
      is_active = true
    } = body

    // Validate required fields
    if (!name_en && !name) {
      throw new ApiError('VALIDATION_ERROR', 'name_en or name is required', 400)
    }

    // Use name_en if provided, otherwise use name
    const finalNameEn = name_en || name
    const finalNameAr = name_ar || name_en || name

    // Check for duplicate name_en
    const { data: existingCategory } = await supabase
      .from('case_categories')
      .select('id')
      .eq('name_en', finalNameEn)
      .maybeSingle()

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    // Insert new category
    const { data: newCategory, error: insertError } = await supabase
      .from('case_categories')
      .insert({
        name: finalNameEn, // Keep name for backward compatibility
        name_en: finalNameEn,
        name_ar: finalNameAr,
        description: description_en || description || null,
        description_en: description_en || description || null,
        description_ar: description_ar || null,
        icon: icon || null,
        color: color || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating category:', insertError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create category', 500)
    }

    return NextResponse.json({ category: newCategory }, { status: 201 })
}

export const GET = createGetHandler(getHandler, { loggerContext: 'api/categories' })
export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/categories' })





