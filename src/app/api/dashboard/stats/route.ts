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

    // Fetch user's contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('amount, status')
      .eq('donor_id', user.id)

    if (contributionsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching contributions:', contributionsError)
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      )
    }

    // Fetch user's cases
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('status')
      .eq('created_by', user.id)

    if (casesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching cases:', casesError)
      return NextResponse.json(
        { error: 'Failed to fetch cases' },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalContributions = contributions?.length || 0
    const totalAmount = (contributions || []).reduce((sum, c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
      return sum + amount
    }, 0)
    const activeCases = (cases || []).filter((c) => c.status === 'active' || c.status === 'published').length
    const completedCases = (cases || []).filter((c) => c.status === 'completed' || c.status === 'closed').length

    return NextResponse.json({
      stats: {
        totalContributions,
        totalAmount,
        activeCases,
        completedCases
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in dashboard stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

