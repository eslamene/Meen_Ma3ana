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

    // Check if user is already a sponsor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user role:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user role' },
        { status: 500 }
      )
    }

    const isSponsor = userData?.role === 'sponsor'
    const role = userData?.role || null

    return NextResponse.json({
      isSponsor,
      role
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in sponsor role check API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

