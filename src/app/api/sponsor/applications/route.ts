import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
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

    // Check if user is already a sponsor
    const { data: existingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (existingUser?.role === 'sponsor') {
      return NextResponse.json(
        { error: 'User is already a sponsor' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      companyName,
      contactPerson,
      email,
      phone,
      website,
      companyDescription,
      sponsorshipTier
    } = body

    // Validate required fields
    if (!companyName || !contactPerson || !email || !phone || !website || !companyDescription || !sponsorshipTier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create sponsor application
    const { data: application, error: applicationError } = await supabase
      .from('sponsor_applications')
      .insert({
        userId: user.id,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim(),
        companyDescription: companyDescription.trim(),
        sponsorshipTier,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (applicationError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating sponsor application:', applicationError)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    return NextResponse.json({ application })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in sponsor applications API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

