import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  
  try {

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Fetch all cases with beneficiary and category information
    let query = supabase
      .from('cases')
      .select(`
        *,
        beneficiaries (
          id,
          name,
          name_ar,
          age,
          gender,
          mobile_number,
          email,
          city,
          governorate,
          risk_level,
          is_verified,
          total_cases,
          active_cases
        ),
        case_categories (
          id,
          name,
          name_en,
          name_ar,
          icon,
          color
        )
      `)
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    const { data: cases, error: casesError } = await query

    if (casesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching cases:', casesError)
      return NextResponse.json(
        { error: 'Failed to fetch cases' },
        { status: 500 }
      )
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json({
        cases: [],
        stats: {
          total: 0,
          published: 0,
          completed: 0,
          closed: 0,
          under_review: 0
        }
      })
    }

    // Fetch all contributions for all cases in a single query
    const caseIds = cases.map(c => c.id)
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select(`
        id,
        case_id,
        amount,
        donor_id,
        contribution_approval_status!contribution_id(
          status,
          created_at,
          updated_at
        )
      `)
      .in('case_id', caseIds)

    if (contribError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching contributions:', contribError)
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      )
    }

    // Group contributions by case_id and compute stats
    const contributionStats = new Map<string, { approved_amount: number; total_contributions: number; contributor_count: number; approved_contributors: Set<string> }>()
    
    // Initialize stats for all cases
    cases.forEach(c => {
      contributionStats.set(c.id, { approved_amount: 0, total_contributions: 0, contributor_count: 0, approved_contributors: new Set() })
    })

    // Process contributions and aggregate by case
    ;(contributions || []).forEach((contribution) => {
      const caseId = contribution.case_id
      const amount = parseFloat(contribution.amount || '0')
      
      if (!contributionStats.has(caseId)) {
        contributionStats.set(caseId, { approved_amount: 0, total_contributions: 0, contributor_count: 0, approved_contributors: new Set() })
      }
      
      const stats = contributionStats.get(caseId)!
      stats.total_contributions += amount

      // Get latest approval status by ordering by created_at or updated_at descending
      const approvalStatuses = contribution.contribution_approval_status || []
      let latestStatus = 'none'
      
      if (Array.isArray(approvalStatuses) && approvalStatuses.length > 0) {
        // Sort by created_at descending, then updated_at descending to get the latest
        const sorted = [...approvalStatuses].sort((a: { updated_at?: string; created_at?: string }, b: { updated_at?: string; created_at?: string }) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
          return bTime - aTime
        })
        latestStatus = sorted[0]?.status || 'none'
      } else if (approvalStatuses && !Array.isArray(approvalStatuses)) {
        latestStatus = (approvalStatuses as { status?: string }).status || 'none'
      }
      
      if (latestStatus === 'approved') {
        stats.approved_amount += amount
        // Track unique approved contributors
        if (contribution.donor_id) {
          stats.approved_contributors.add(contribution.donor_id)
        }
      }
    })

    // Merge stats back into cases array
    const casesWithStats = (cases || []).map(case_ => {
      const stats = contributionStats.get(case_.id) || { approved_amount: 0, total_contributions: 0, contributor_count: 0, approved_contributors: new Set() }
      return {
        ...case_,
        approved_amount: stats.approved_amount,
        total_contributions: stats.total_contributions,
        contributor_count: stats.approved_contributors.size
      }
    })

    // Calculate overall statistics
    const total = casesWithStats.length
    const published = casesWithStats.filter(c => c.status === 'published').length
    const completed = casesWithStats.filter(c => c.status === 'completed').length
    const closed = casesWithStats.filter(c => c.status === 'closed').length
    const under_review = casesWithStats.filter(c => c.status === 'under_review').length

    return NextResponse.json({
      cases: casesWithStats,
      stats: {
        total,
        published,
        completed,
        closed,
        under_review
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin cases stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/cases/stats' })

