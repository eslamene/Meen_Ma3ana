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

    const updates = [
      { key: 'validation.case.title.min_length', value: settings.caseTitleMinLength },
      { key: 'validation.case.title.max_length', value: settings.caseTitleMaxLength },
      { key: 'validation.case.description.min_length', value: settings.caseDescriptionMinLength },
      { key: 'validation.case.description.max_length', value: settings.caseDescriptionMaxLength },
      { key: 'validation.case.target_amount.max', value: settings.caseTargetAmountMax },
      { key: 'validation.case.duration.max', value: settings.caseDurationMax },
    ]

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

