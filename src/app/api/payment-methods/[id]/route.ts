import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const params = await context.params
    const supabase = await createClient()

    const { data: paymentMethod, error } = await supabase
      .from('payment_methods')
      .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Payment method not found' },
          { status: 404 }
        )
      }
      logger.error('Error fetching payment method:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({ paymentMethod })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in payment methods API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const params = await context.params
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
        return NextResponse.json(
          { error: 'Payment method with this code already exists' },
          { status: 400 }
        )
      }
    }

    const { data: updatedMethod, error: updateError } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating payment method:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({ paymentMethod: updatedMethod })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in payment methods API PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const params = await context.params
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

    // Check if payment method is used in contributions
    const { data: contributions, error: checkError } = await supabase
      .from('contributions')
      .select('id')
      .eq('payment_method_id', params.id)
      .limit(1)

    if (checkError) {
      logger.error('Error checking payment method usage:', checkError)
    }

    if (contributions && contributions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payment method that is in use. Deactivate it instead.' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting payment method:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in payment methods API DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

