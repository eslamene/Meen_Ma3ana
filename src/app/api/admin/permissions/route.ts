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

    const permissions = await serverDbRBAC.getPermissions()
    return NextResponse.json({ success: true, permissions })

  } catch (error) {
    console.error('API Error in /api/admin/permissions GET:', error)
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
    const { name, display_name, description, resource, action, module_id } = body

    if (!name || !display_name || !resource || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: name, display_name, resource, action' 
      }, { status: 400 })
    }

    // If no module_id provided, try to find module by resource name
    let finalModuleId = module_id
    if (!finalModuleId && resource) {
      const { data: module } = await supabase
        .from('permission_modules')
        .select('id')
        .eq('name', resource)
        .single()
      
      finalModuleId = module?.id
    }

    const { data: permission, error } = await supabase
      .from('permissions')
      .insert({
        name,
        display_name,
        description: description || '',
        resource,
        action,
        module_id: finalModuleId,
        is_system: false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      permission,
      message: 'Permission created successfully' 
    })

  } catch (error) {
    console.error('API Error in /api/admin/permissions POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create permission'
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
    const { id, display_name, description } = body

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Permission ID is required' 
      }, { status: 400 })
    }

    const permission = await serverDbRBAC.updatePermission(id, {
      display_name,
      description
    })

    return NextResponse.json({ 
      success: true, 
      permission,
      message: 'Permission updated successfully' 
    })

  } catch (error) {
    console.error('API Error in /api/admin/permissions PUT:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update permission'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Permission ID is required' 
      }, { status: 400 })
    }

    await serverDbRBAC.deletePermission(id)

    return NextResponse.json({ 
      success: true,
      message: 'Permission deleted successfully' 
    })

  } catch (error) {
    console.error('API Error in /api/admin/permissions DELETE:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete permission'
    }, { status: 500 })
  }
}
