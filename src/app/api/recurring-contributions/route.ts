import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('recurring_contributions')
      .select('*')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching recurring contributions:', error)
      return NextResponse.json({ error: 'Failed to fetch recurring contributions' }, { status: 500 })
    }

    return NextResponse.json({
      recurringContributions: data || [],
      total: data?.length || 0
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in recurring contributions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      caseId,
      projectId,
      amount,
      frequency,
      startDate,
      endDate,
      paymentMethod,
      autoProcess,
      notes
    } = body

    // Validate required fields
    if (!amount || !frequency || !startDate || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate next contribution date based on frequency
    const startDateObj = new Date(startDate)
    const nextContributionDate = new Date(startDateObj)
    
    switch (frequency) {
      case 'weekly':
        nextContributionDate.setDate(startDateObj.getDate() + 7)
        break
      case 'monthly':
        nextContributionDate.setMonth(startDateObj.getMonth() + 1)
        break
      case 'quarterly':
        nextContributionDate.setMonth(startDateObj.getMonth() + 3)
        break
      case 'yearly':
        nextContributionDate.setFullYear(startDateObj.getFullYear() + 1)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid frequency' },
          { status: 400 }
        )
    }

    const { data, error } = await supabase
      .from('recurring_contributions')
      .insert({
        donor_id: user.id,
        case_id: caseId || null,
        project_id: projectId || null,
        amount: parseFloat(amount),
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        next_contribution_date: nextContributionDate.toISOString(),
        payment_method: paymentMethod,
        auto_process: autoProcess !== false, // default to true
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating recurring contribution:', error)
      return NextResponse.json({ error: 'Failed to create recurring contribution' }, { status: 500 })
    }

    return NextResponse.json({ recurringContribution: data })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in recurring contributions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 