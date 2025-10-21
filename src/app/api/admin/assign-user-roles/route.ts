import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, roleIds } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('Assigning roles to user:', userId)
    console.log('New roles:', roleIds)

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, remove all existing roles for this user
    const { error: deleteError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error removing existing user roles:', deleteError)
      throw deleteError
    }

    console.log('Removed existing user roles')

    // Then, add the new roles
    if (roleIds && roleIds.length > 0) {
      const userRoles = roleIds.map((roleId: string) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: null, // We don't have the current user context here
        is_active: true
      }))

      const { error: insertError } = await adminClient
        .from('user_roles')
        .insert(userRoles)

      if (insertError) {
        console.error('Error inserting new user roles:', insertError)
        throw insertError
      }

      console.log('Added new user roles:', roleIds.length)
    }

    return NextResponse.json({
      success: true,
      message: 'User roles updated successfully'
    })

  } catch (error) {
    console.error('Assign user roles API error:', error)
    return NextResponse.json({
      error: 'Failed to assign user roles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
