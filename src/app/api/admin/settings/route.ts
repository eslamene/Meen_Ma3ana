import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
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
    const { data: adminRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('admin_roles.name', ['admin', 'super_admin'])
      .limit(1)

    const isAdmin = (adminRoles?.length || 0) > 0

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, description, description_ar')
      .in('config_key', [
        'validation.case.title.min_length',
        'validation.case.title.max_length',
        'validation.case.description.min_length',
        'validation.case.description.max_length',
        'validation.case.target_amount.max',
        'validation.case.duration.max',
        'pagination.scroll.items_per_page',
        'pagination.desktop.default_items_per_page',
        'pagination.desktop.items_per_page_options',
      ])
      .order('config_key')

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to load system settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ configs: data || [] })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin settings GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { data: adminRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('admin_roles.name', ['admin', 'super_admin'])
      .limit(1)

    const isAdmin = (adminRoles?.length || 0) > 0

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Validate pagination settings before building updates array
    if (settings.desktopDefaultItemsPerPage !== undefined && settings.desktopDefaultItemsPerPage !== null) {
      const desktopDefault = Number(settings.desktopDefaultItemsPerPage)
      if (isNaN(desktopDefault) || desktopDefault <= 0) {
        return NextResponse.json(
          { error: 'Invalid desktopDefaultItemsPerPage: must be a positive number' },
          { status: 400 }
        )
      }
    }

    if (settings.desktopItemsPerPageOptions !== undefined && settings.desktopItemsPerPageOptions !== null) {
      if (typeof settings.desktopItemsPerPageOptions !== 'string' && !Array.isArray(settings.desktopItemsPerPageOptions)) {
        return NextResponse.json(
          { error: 'Invalid desktopItemsPerPageOptions: must be a string or array' },
          { status: 400 }
        )
      }
      // If it's a string, validate it's not empty
      if (typeof settings.desktopItemsPerPageOptions === 'string' && settings.desktopItemsPerPageOptions.trim() === '') {
        return NextResponse.json(
          { error: 'Invalid desktopItemsPerPageOptions: cannot be empty' },
          { status: 400 }
        )
      }
    }

    // Check if pagination settings are partially provided (one but not the other)
    const hasDesktopDefault = settings.desktopDefaultItemsPerPage !== undefined && settings.desktopDefaultItemsPerPage !== null
    const hasDesktopOptions = settings.desktopItemsPerPageOptions !== undefined && settings.desktopItemsPerPageOptions !== null
    
    if ((hasDesktopDefault && !hasDesktopOptions) || (!hasDesktopDefault && hasDesktopOptions)) {
      return NextResponse.json(
        { error: 'Pagination settings must be provided together: both desktopDefaultItemsPerPage and desktopItemsPerPageOptions are required' },
        { status: 400 }
      )
    }

    const updates = [
      { key: 'validation.case.title.min_length', value: settings.caseTitleMinLength },
      { key: 'validation.case.title.max_length', value: settings.caseTitleMaxLength },
      { key: 'validation.case.description.min_length', value: settings.caseDescriptionMinLength },
      { key: 'validation.case.description.max_length', value: settings.caseDescriptionMaxLength },
      { key: 'validation.case.target_amount.max', value: settings.caseTargetAmountMax },
      { key: 'validation.case.duration.max', value: settings.caseDurationMax },
      { key: 'pagination.scroll.items_per_page', value: settings.scrollItemsPerPage },
    ]

    // Only add pagination desktop settings if they are provided and valid
    if (hasDesktopDefault && hasDesktopOptions) {
      updates.push(
        { key: 'pagination.desktop.default_items_per_page', value: settings.desktopDefaultItemsPerPage },
        { key: 'pagination.desktop.items_per_page_options', value: settings.desktopItemsPerPageOptions }
      )
    }

    // Update each setting
    for (const update of updates) {
      const { error } = await supabase
        .from('system_config')
        .update({ 
          config_value: update.value,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', update.key)

      if (error) {
        logger.logStableError('INTERNAL_SERVER_ERROR', `Error updating ${update.key}:`, error)
        return NextResponse.json(
          { error: `Failed to update ${update.key}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin settings PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

