import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * GET /api/recurring-contributions
 * Fetch recurring contributions for the authenticated user
 * Returns contributions with joined case and project data
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch recurring contributions with joined case and project data
    const { data: contributions, error } = await supabase
      .from('recurring_contributions')
      .select(`
        *,
        cases(title_en, title_ar),
        projects(name)
      `)
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching recurring contributions:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch recurring contributions' 
      }, { status: 500 })
    }

    // Transform the data to include case/project metadata in a flat structure
    const transformedContributions = (contributions || []).map((contrib: any) => {
      const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
      const projectData = Array.isArray(contrib.projects) ? contrib.projects[0] : contrib.projects

      return {
        id: contrib.id,
        amount: contrib.amount,
        frequency: contrib.frequency,
        status: contrib.status,
        start_date: contrib.start_date,
        end_date: contrib.end_date,
        next_contribution_date: contrib.next_contribution_date,
        total_contributions: contrib.total_contributions || 0,
        successful_contributions: contrib.successful_contributions || 0,
        failed_contributions: contrib.failed_contributions || 0,
        payment_method: contrib.payment_method,
        auto_process: contrib.auto_process,
        notes: contrib.notes,
        case_id: contrib.case_id,
        project_id: contrib.project_id,
        created_at: contrib.created_at,
        // Include resolved metadata
        case_title: caseData?.title_en || caseData?.title_ar || null,
        project_name: projectData?.name || null
      }
    })

    // Calculate aggregates server-side
    const total = transformedContributions.length
    const active = transformedContributions.filter((c: any) => c.status === 'active').length
    const paused = transformedContributions.filter((c: any) => c.status === 'paused').length
    const cancelled = transformedContributions.filter((c: any) => c.status === 'cancelled').length
    const completed = transformedContributions.filter((c: any) => c.status === 'completed').length

    return NextResponse.json({
      contributions: transformedContributions,
      aggregates: {
        total,
        active,
        paused,
        cancelled,
        completed
      }
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/recurring-contributions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST /api/recurring-contributions
 * Create a new recurring contribution
 */
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
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

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be greater than 0' 
      }, { status: 400 })
    }

    if (!frequency || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
      return NextResponse.json({ 
        error: 'Invalid frequency. Must be one of: weekly, monthly, quarterly, yearly' 
      }, { status: 400 })
    }

    if (!startDate) {
      return NextResponse.json({ 
        error: 'Start date is required' 
      }, { status: 400 })
    }

    // Calculate next contribution date based on frequency
    const start = new Date(startDate)
    const nextContributionDate = new Date(start)
    
    switch (frequency) {
      case 'weekly':
        nextContributionDate.setDate(start.getDate() + 7)
        break
      case 'monthly':
        nextContributionDate.setMonth(start.getMonth() + 1)
        break
      case 'quarterly':
        nextContributionDate.setMonth(start.getMonth() + 3)
        break
      case 'yearly':
        nextContributionDate.setFullYear(start.getFullYear() + 1)
        break
    }

    // Insert recurring contribution
    const { data: contribution, error: insertError } = await supabase
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
        payment_method: paymentMethod || 'bank_transfer',
        auto_process: autoProcess !== undefined ? autoProcess : true,
        notes: notes || null,
        status: 'active'
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error creating recurring contribution:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create recurring contribution',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json(contribution, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/recurring-contributions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
