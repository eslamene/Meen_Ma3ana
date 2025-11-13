import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('case_categories')
      .select('id, name, name_en, name_ar, description, description_en, description_ar, icon, color, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching category:', error)
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ category })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in category GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { id } = await context.params
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
      is_active
    } = body

    // Build update object
    const updateData: Record<string, any> = {
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
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 400 }
        )
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
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category: updatedCategory })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in category PATCH API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { id } = await context.params
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

    // Check if category is used by any cases
    const { data: casesUsingCategory, error: casesError } = await supabase
      .from('cases')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (casesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking category usage:', casesError)
      return NextResponse.json(
        { error: 'Failed to check category usage' },
        { status: 500 }
      )
    }

    if (casesUsingCategory && casesUsingCategory.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category: It is being used by one or more cases. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('case_categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting category:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in category DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




