import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverDbRBAC } from '@/lib/rbac/server-rbac'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await serverDbRBAC.userHasPermission(user.id, 'admin:rbac')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const grouped = searchParams.get('grouped') === 'true'

    if (grouped) {
      const groupedPermissions = await serverDbRBAC.getPermissionsByModule()
      return NextResponse.json({ success: true, modules: groupedPermissions })
    } else {
      const modules = await serverDbRBAC.getPermissionModules()
      return NextResponse.json({ success: true, modules })
    }

  } catch (error) {
    console.error('API Error in /api/admin/permission-modules GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await serverDbRBAC.userHasPermission(user.id, 'admin:rbac')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, display_name, description, icon, color, sort_order } = body

    if (!name || !display_name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: name, display_name' 
      }, { status: 400 })
    }

    const { data: module, error } = await supabase
      .from('permission_modules')
      .insert({
        name,
        display_name,
        description: description || '',
        icon: icon || 'Package',
        color: color || 'gray',
        sort_order: sort_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      module,
      message: 'Permission module created successfully' 
    })

  } catch (error) {
    console.error('API Error in /api/admin/permission-modules POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create permission module'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await serverDbRBAC.userHasPermission(user.id, 'admin:rbac')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, display_name, description, icon, color, sort_order, is_active } = body

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Module ID is required' 
      }, { status: 400 })
    }

    const { data: module, error } = await supabase
      .from('permission_modules')
      .update({
        display_name,
        description,
        icon,
        color,
        sort_order,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      module,
      message: 'Permission module updated successfully' 
    })

  } catch (error) {
    console.error('API Error in /api/admin/permission-modules PUT:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update permission module'
    }, { status: 500 })
  }
}
