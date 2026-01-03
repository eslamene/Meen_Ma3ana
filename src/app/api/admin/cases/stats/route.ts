import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  
  try {

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url)
    const statusParams = searchParams.getAll('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const sortBy = searchParams.get('sortBy') || 'created_at_desc'
    
    const offset = (page - 1) * limit

    // Fetch cases with beneficiary and category information
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
      `, { count: 'exact' })

    // Apply status filter if provided (support multiple statuses)
    if (statusParams.length > 0) {
      // Filter out 'all' if present
      const validStatuses = statusParams.filter(s => s !== 'all')
      if (validStatuses.length > 0) {
        query = query.in('status', validStatuses)
      }
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    // Apply sorting
    switch (sortBy) {
      case 'contributors_high':
      case 'contributors_low':
      case 'amount_high':
      case 'amount_low':
        // These require post-processing, so we'll sort by created_at first
        query = query.order('created_at', { ascending: false })
        break
      case 'created_at_asc':
        query = query.order('created_at', { ascending: true })
        break
      case 'created_at_desc':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: cases, error: casesError, count } = await query

    if (casesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching cases:', casesError)
      return NextResponse.json(
        { error: 'Failed to fetch cases' },
        { status: 500 }
      )
    }

    // Get stats even if no cases match the current filter (for pagination)
    // We'll calculate stats from all cases below, so we don't need to return early

    // Fetch all contributions for all cases in a single query
    const caseIds = (cases || []).map(c => c.id)
    let contributions: any[] = []
    
    // Only fetch contributions if we have cases
    if (caseIds.length > 0) {
      const { data: contribData, error: contribError } = await supabase
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
      
      contributions = contribData || []
    }

    // Group contributions by case_id and compute stats
    const contributionStats = new Map<string, { approved_amount: number; total_contributions: number; contributor_count: number; approved_contributors: Set<string> }>()
    
    // Initialize stats for all cases
    ;(cases || []).forEach(c => {
      contributionStats.set(c.id, { approved_amount: 0, total_contributions: 0, contributor_count: 0, approved_contributors: new Set() })
    })

    // Process contributions and aggregate by case
    contributions.forEach((contribution) => {
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
    let casesWithStats = (cases || []).map(case_ => {
      const stats = contributionStats.get(case_.id) || { approved_amount: 0, total_contributions: 0, contributor_count: 0, approved_contributors: new Set() }
      return {
        ...case_,
        approved_amount: stats.approved_amount,
        total_contributions: stats.total_contributions,
        contributor_count: stats.approved_contributors.size
      }
    })

    // Apply sorting that requires post-processing (contributors and amount)
    if (sortBy === 'contributors_high' || sortBy === 'contributors_low' || 
        sortBy === 'amount_high' || sortBy === 'amount_low') {
      casesWithStats = casesWithStats.sort((a, b) => {
        switch (sortBy) {
          case 'contributors_high':
            return (b.contributor_count || 0) - (a.contributor_count || 0)
          case 'contributors_low':
            return (a.contributor_count || 0) - (b.contributor_count || 0)
          case 'amount_high':
            return (b.approved_amount || 0) - (a.approved_amount || 0)
          case 'amount_low':
            return (a.approved_amount || 0) - (b.approved_amount || 0)
          default:
            return 0
        }
      })
    }

    // Get filtered count for pagination (with current filters applied)
    let filteredCountQuery = supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    // Apply the same filters to get filtered count for pagination
    if (statusParams.length > 0) {
      const validStatuses = statusParams.filter(s => s !== 'all')
      if (validStatuses.length > 0) {
        filteredCountQuery = filteredCountQuery.in('status', validStatuses)
      }
    }

    if (search) {
      filteredCountQuery = filteredCountQuery.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    const { count: filteredCount } = await filteredCountQuery

    // Get ALL cases for statistics (stats should always show total counts regardless of filters)
    // Need to include target_amount and current_amount to calculate completed cases
    const { data: allCases, count: totalCount, error: statsError } = await supabase
      .from('cases')
      .select('id, status, target_amount, current_amount', { count: 'exact' })

    if (statsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching stats:', statsError)
      // Fallback to filtered counts if stats query fails
      const total = filteredCount || 0
      const published = cases?.filter(c => c.status === 'published').length || 0
      // Completed = cases with status 'completed'
      const completed = cases?.filter(c => c.status === 'completed').length || 0
      const closed = cases?.filter(c => c.status === 'closed').length || 0
      // Under Review = draft cases (cases that need review before publishing)
      const under_review = cases?.filter(c => c.status === 'draft').length || 0
      
      return NextResponse.json({
        cases: casesWithStats,
        pagination: {
          page,
          limit,
          total: filteredCount || 0,
          totalPages: Math.ceil((filteredCount || 0) / limit),
          hasNextPage: page < Math.ceil((filteredCount || 0) / limit),
          hasPreviousPage: page > 1
        },
        stats: {
          total,
          published,
          completed,
          closed,
          under_review
        }
      })
    }

    // Calculate overall statistics from ALL cases (not filtered)
    const total = totalCount || 0
    const published = allCases?.filter(c => c.status === 'published').length || 0
    // Completed = cases with status 'completed'
    const completed = allCases?.filter(c => c.status === 'completed').length || 0
    const closed = allCases?.filter(c => c.status === 'closed').length || 0
    // Under Review = draft cases (cases that need review before publishing)
    const under_review = allCases?.filter(c => c.status === 'draft').length || 0

    return NextResponse.json({
      cases: casesWithStats,
      pagination: {
        page,
        limit,
        total: filteredCount || 0, // Use filtered count for pagination
        totalPages: Math.ceil((filteredCount || 0) / limit),
        hasNextPage: page < Math.ceil((filteredCount || 0) / limit),
        hasPreviousPage: page > 1
      },
      stats: {
        total, // Total count of ALL cases for stats
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

