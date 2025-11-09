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
      .from('payment_methods')
      .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
      .order('sort_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching payment methods:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payment methods' },
        { status: 500 }
      )
    }

    return NextResponse.json({ paymentMethods: data || [] })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in payment methods API:', error)
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
    let isAdmin = false
    try {
      const { data: adminRoles } = await supabase
        .from('admin_user_roles')
        .select(`
          admin_roles (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (adminRoles && adminRoles.length > 0) {
        isAdmin = adminRoles.some((ur: any) => {
          const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
          return role?.name === 'admin' || role?.name === 'super_admin' || (role?.level && role.level >= 8)
        })
      }
    } catch (error) {
      logger.error('Error checking admin status:', error)
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

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
      return NextResponse.json(
        { error: 'code is required' },
        { status: 400 }
      )
    }

    if (!name_en && !name) {
      return NextResponse.json(
        { error: 'name_en or name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const { data: existingMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (existingMethod) {
      return NextResponse.json(
        { error: 'Payment method with this code already exists' },
        { status: 400 }
      )
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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating payment method:', insertError)
      return NextResponse.json(
        { error: 'Failed to create payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({ paymentMethod: newMethod }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in payment methods API POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 