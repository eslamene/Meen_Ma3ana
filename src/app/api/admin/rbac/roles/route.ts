import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create admin client to bypass auth
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get roles directly
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('rbac_roles')
      .select(`
        *,
        permissions:rbac_role_permissions(
          permission:rbac_permissions(*)
        ),
        user_count:rbac_user_roles(count)
      `)
      .order('level', { ascending: false })

    if (rolesError) throw rolesError

    // Transform the data to match expected format
    const transformedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions?.map((rp: any) => rp.permission) || [],
      user_count: role.user_count?.[0]?.count || 0
    }))

    return NextResponse.json({
      success: true,
      roles: transformedRoles
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error: any) {
    console.error('Roles fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch roles',
      details: error.message
    }, { status: 500 })
  }
}