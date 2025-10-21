import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting users fetch...')
    
    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Admin client created')

    // Fetch users
    const { data: authUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    console.log('Users fetched:', authUsers.users.length)

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        roles(id, name, display_name)
      `)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      // Don't throw, just return empty array
    }

    console.log('User roles fetched:', userRoles?.length || 0)

    return NextResponse.json({
      success: true,
      users: authUsers.users,
      userRoles: userRoles || []
    })

  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
