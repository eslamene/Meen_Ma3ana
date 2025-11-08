import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    const supabase = await createClient()

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
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in categories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

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
      return NextResponse.json(
        { error: 'name_en or name is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category: newCategory }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in categories API POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

