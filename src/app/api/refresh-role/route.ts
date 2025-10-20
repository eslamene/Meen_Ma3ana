import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    // Fetch the latest role from the database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user role from database'
      }, { status: 500 })
    }

    const currentRole = userData?.role || 'donor'

    // Update the session metadata with the latest role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: currentRole }
    })

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update session metadata'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Role refreshed successfully',
      role: currentRole,
      user: {
        id: user.id,
        email: user.email,
        role: currentRole
      }
    })

  } catch (error) {
    console.error('Server error:', error)
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

    // Fetch the latest role from the database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user role from database'
      }, { status: 500 })
    }

    const currentRole = userData?.role || 'donor'

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
    console.error('Server error:', error)
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
} 