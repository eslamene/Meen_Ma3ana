import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

/**
 * GET /api/recurring-contributions
 * Fetch recurring contributions for the authenticated user
 * Returns contributions with joined case and project data
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

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
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch recurring contributions', 500)
    }

    // Transform the data to include case/project metadata in a flat structure
    interface RecurringContribution {
      id: string
      amount: number
      frequency: string
      status: string
      start_date: string | null
      end_date: string | null
      next_contribution_date: string | null
      total_contributions?: number
      successful_contributions?: number
      failed_contributions?: number
      payment_method: string | null
      auto_process: boolean
      notes: string | null
      case_id: string | null
      project_id: string | null
      created_at: string
      cases?: Array<{ title_en?: string; title_ar?: string }> | { title_en?: string; title_ar?: string }
      projects?: Array<{ name?: string }> | { name?: string }
    }
    const transformedContributions = (contributions || []).map((contrib: RecurringContribution) => {
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
    interface TransformedContribution {
      status: string
    }
    const total = transformedContributions.length
    const active = transformedContributions.filter((c: TransformedContribution) => c.status === 'active').length
    const paused = transformedContributions.filter((c: TransformedContribution) => c.status === 'paused').length
    const cancelled = transformedContributions.filter((c: TransformedContribution) => c.status === 'cancelled').length
    const completed = transformedContributions.filter((c: TransformedContribution) => c.status === 'completed').length

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
}

/**
 * POST /api/recurring-contributions
 * Create a new recurring contribution
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

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
      throw new ApiError('VALIDATION_ERROR', 'Amount must be greater than 0', 400)
    }

    if (!frequency || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid frequency. Must be one of: weekly, monthly, quarterly, yearly', 400)
    }

    if (!startDate) {
      throw new ApiError('VALIDATION_ERROR', 'Start date is required', 400)
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
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create recurring contribution', 500, { details: insertError.message })
    }

    return NextResponse.json(contribution, { status: 201 })
}

export const GET = createGetHandler(getHandler, { requireAuth: true, loggerContext: 'api/recurring-contributions' })
export const POST = createPostHandler(postHandler, { requireAuth: true, loggerContext: 'api/recurring-contributions' })
