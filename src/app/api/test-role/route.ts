import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/rbac'

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json()
    
    if (!role || !['donor', 'sponsor', 'admin'].includes(role)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid role. Must be donor, sponsor, or admin.'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        message: 'User not authenticated'
      }, { status: 401 })
    }

    // Update user metadata with new role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: role as UserRole }
    })

    if (updateError) {
      return NextResponse.json({
        success: false,
        message: `Failed to update role: ${updateError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
      role: role
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        message: 'User not authenticated'
      }, { status: 401 })
    }

    const currentRole = user.user_metadata?.role || 'donor'

    return NextResponse.json({
      success: true,
      role: currentRole,
      user: {
        id: user.id,
        email: user.email,
        role: currentRole
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
} 