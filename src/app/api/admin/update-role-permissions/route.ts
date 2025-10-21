import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleId, permissionIds } = body

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 })
    }

    console.log('Updating permissions for role:', roleId)
    console.log('New permissions:', permissionIds)

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, remove all existing permissions for this role
    const { error: deleteError } = await adminClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (deleteError) {
      console.error('Error removing existing permissions:', deleteError)
      throw deleteError
    }

    console.log('Removed existing permissions')

    // Then, add the new permissions
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map((permissionId: string) => ({
        role_id: roleId,
        permission_id: permissionId
      }))

      const { error: insertError } = await adminClient
        .from('role_permissions')
        .insert(rolePermissions)

      if (insertError) {
        console.error('Error inserting new permissions:', insertError)
        throw insertError
      }

      console.log('Added new permissions:', permissionIds.length)
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully'
    })

  } catch (error) {
    console.error('Update role permissions API error:', error)
    return NextResponse.json({
      error: 'Failed to update role permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
