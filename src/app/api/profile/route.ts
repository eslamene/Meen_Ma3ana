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

    // Fetch user profile data - only editable fields
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, address, profile_image, language, updated_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: userProfile
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in profile API:', error)
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

    const body = await request.json()
    const { firstName, lastName, phone, address } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Validate phone format if provided
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, first_name, last_name, phone, address, profile_image, language, updated_at')
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: updatedUser
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in profile update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

