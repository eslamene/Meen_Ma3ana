import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/config/env'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { Logger } from '@/lib/logger'
import type { ContributionRow } from '@/types/contribution'

/**
 * Comprehensive GET handler for contributions API
 * Uses database functions for efficient search and filtering
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  // Parse query parameters - including all advanced filters
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const amountMin = searchParams.get('amountMin')
  const amountMax = searchParams.get('amountMax')
  const donorName = searchParams.get('donorName')
  const paymentMethod = searchParams.get('paymentMethod')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100) // Max 100 per page
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const isAdmin = searchParams.get('admin') === 'true'
  
  const offset = (page - 1) * limit

  // Validate pagination
  if (page < 1) {
    throw new ApiError('VALIDATION_ERROR', 'Page must be greater than 0', 400)
  }

  if (limit < 1 || limit > 100) {
    throw new ApiError('VALIDATION_ERROR', 'Limit must be between 1 and 100', 400)
  }

    // Check if user is actually an admin (verify admin role via RBAC)
    let isActuallyAdmin = false
    if (isAdmin) {
      // Check admin role via admin_user_roles table
      const { data: adminRoles } = await supabase
        .from('admin_user_roles')
        .select('admin_roles!inner(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('admin_roles.name', ['admin', 'super_admin'])
        .limit(1)
      
      isActuallyAdmin = (adminRoles?.length || 0) > 0
    }

    // Parse dates
    let parsedDateFrom: Date | null = null
    let parsedDateTo: Date | null = null
    
    if (dateFrom) {
      parsedDateFrom = new Date(dateFrom)
      parsedDateFrom.setHours(0, 0, 0, 0)
    }
    
    if (dateTo) {
      parsedDateTo = new Date(dateTo)
      parsedDateTo.setHours(23, 59, 59, 999)
    }

    // Check if we have filters that the RPC function doesn't support
    // If so, use direct query method which handles all filters properly
    const hasAdvancedFilters = !!(amountMin || amountMax || donorName || paymentMethod)
    
    if (hasAdvancedFilters) {
      // Use direct query method for advanced filters
      logger.info('Using direct query method due to advanced filters')
      try {
        return await getContributionsDirectQuery(
          supabase,
          user.id,
          isActuallyAdmin,
          { 
            status, 
            search, 
            dateFrom: parsedDateFrom, 
            dateTo: parsedDateTo,
            amountMin: amountMin ? parseFloat(amountMin) : null,
            amountMax: amountMax ? parseFloat(amountMax) : null,
            donorName: donorName || null,
            paymentMethod: paymentMethod || null,
            sortBy, 
            sortOrder, 
            page, 
            limit, 
            offset 
          },
          logger
        )
      } catch (fallbackError) {
        logger.error('Direct query failed:', fallbackError)
        throw fallbackError
      }
    }

    // Use database function for efficient search (only when no advanced filters)
    const { data: contributions, error: searchError } = await supabase.rpc('search_contributions', {
      p_user_id: user.id,
      p_is_admin: isActuallyAdmin,
      p_status: status || null,
      p_search: search?.trim() || null,
      p_date_from: parsedDateFrom?.toISOString() || null,
      p_date_to: parsedDateTo?.toISOString() || null,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_limit: limit,
      p_offset: offset
    })

    if (searchError) {
      logger.error('Error searching contributions (RPC may not exist):', searchError, {
        query: 'GET /api/contributions',
        userId: user.id,
        isAdmin: isActuallyAdmin,
        errorCode: searchError.code,
        errorDetails: searchError.details,
        errorHint: searchError.hint
      })

      // Fallback to direct query if function doesn't exist
      logger.info('Falling back to direct query method')
      try {
        return await getContributionsDirectQuery(
          supabase,
          user.id,
          isActuallyAdmin,
          { 
            status, 
            search, 
            dateFrom: parsedDateFrom, 
            dateTo: parsedDateTo,
            amountMin: amountMin ? parseFloat(amountMin) : null,
            amountMax: amountMax ? parseFloat(amountMax) : null,
            donorName: donorName || null,
            paymentMethod: paymentMethod || null,
            sortBy, 
            sortOrder, 
            page, 
            limit, 
            offset 
          },
          logger
        )
      } catch (fallbackError) {
        logger.error('Fallback query also failed:', fallbackError)
        throw fallbackError
      }
    }

    // Get total count for pagination (only for filters supported by RPC)
    const { data: totalCount, error: countError } = await supabase.rpc('count_contributions', {
      p_user_id: user.id,
      p_is_admin: isActuallyAdmin,
      p_status: status || null,
      p_search: search?.trim() || null,
      p_date_from: parsedDateFrom?.toISOString() || null,
      p_date_to: parsedDateTo?.toISOString() || null
    })

    if (countError) {
      logger.warn('Error counting contributions, using estimate:', countError)
    }

    // Normalize field names for frontend
    const normalizedContributions = (contributions || []).map((c: ContributionRow) => {
      const donorName = c.donor_first_name || c.donor_last_name
        ? `${c.donor_first_name || ''} ${c.donor_last_name || ''}`.trim()
        : c.donor_email || 'Anonymous'

      return {
        // Core fields
        id: c.id,
        amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
        status: c.status,
        notes: c.notes || null,
        message: c.message || null,
        anonymous: !!c.anonymous,
        payment_method: c.payment_method || null,

        // Timestamps
        createdAt: c.created_at || null,
        updatedAt: c.updated_at || null,

        // Relations
        caseId: c.case_id || null,
        caseTitle: c.case_title || '',
        donorName,
        donorId: c.donor_id || null,
        donorEmail: c.donor_email || null,
        donorFirstName: c.donor_first_name || null,
        donorLastName: c.donor_last_name || null,
        donorPhone: c.donor_phone || null,
        proofUrl: c.proof_url || c.proof_of_payment || null,

        // Approval status
        approval_status: c.approval_status ? [{
          status: c.approval_status,
          rejection_reason: c.approval_rejection_reason,
          admin_comment: c.approval_admin_comment,
          donor_reply: c.approval_donor_reply,
          resubmission_count: c.approval_resubmission_count,
          created_at: c.approval_created_at,
          updated_at: c.approval_updated_at
        }] : []
      }
    })

    // Calculate statistics
    const stats = await calculateStats(supabase, user.id, isActuallyAdmin, logger)

    return NextResponse.json({
      contributions: normalizedContributions,
      pagination: {
        page,
        limit,
        total: totalCount || normalizedContributions.length,
        totalPages: Math.ceil((totalCount || normalizedContributions.length) / limit),
        hasNextPage: page < Math.ceil((totalCount || normalizedContributions.length) / limit),
        hasPreviousPage: page > 1
      },
      stats
    })
}

/**
 * Fallback method using direct Supabase queries
 * Used when database functions are not available
 */
async function getContributionsDirectQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isAdmin: boolean,
  filters: {
    status?: string | null
    search?: string | null
    dateFrom?: Date | null
    dateTo?: Date | null
    amountMin?: number | null
    amountMax?: number | null
    donorName?: string | null
    paymentMethod?: string | null
    sortBy: string
    sortOrder: string
    page: number
    limit: number
    offset: number
  },
  logger: Logger
) {
  try {
    logger.info('Building contributions query with filters:', {
      status: filters.status,
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      donorName: filters.donorName,
      paymentMethod: filters.paymentMethod,
      search: filters.search
    })

    // Step 1: If filtering by status, get contribution IDs from approval_status
    // We'll apply this filter after other filters to avoid fetching too many IDs
    let statusFilterApplied = false
    let statusFilteredIds: Set<string> | null = null
    
    if (filters.status && filters.status !== 'all') {
      const statusFilter = filters.status.toLowerCase().trim()
      
      if (statusFilter === 'pending') {
        // Pending = contributions that don't have approved/rejected status
        // Get IDs of contributions with approved/rejected status to exclude them
        const { data: excludedStatuses } = await supabase
          .from('contribution_approval_status')
          .select('contribution_id')
          .in('status', ['approved', 'rejected'])
        
        const excludedIds = new Set((excludedStatuses || []).map((a: any) => a.contribution_id))
        statusFilteredIds = excludedIds
        statusFilterApplied = true
        
        logger.debug('Pending filter: excluding contributions with approved/rejected status', {
          excludedCount: excludedIds.size
        })
      } else {
        // For approved/rejected: get contribution IDs with matching status
        const { data: matchingStatuses } = await supabase
          .from('contribution_approval_status')
          .select('contribution_id')
          .eq('status', statusFilter)
        
        const matchingIds = new Set((matchingStatuses || []).map((a: any) => a.contribution_id))
        statusFilteredIds = matchingIds
        statusFilterApplied = true
        
        logger.debug('Status filter result:', {
          status: filters.status,
          matchingCount: matchingIds.size
        })
      }
    }

    // Step 2: Build main query with all filters applied at database level
    let query = supabase
      .from('contributions')
      .select(`
        *,
        payment_methods (
          id,
          code,
          name,
          name_en,
          name_ar
        )
      `, { count: 'exact' })

    // Filter by user if not admin
    if (!isAdmin) {
      query = query.eq('donor_id', userId)
    }

    // Note: Status filter will be applied after fetching, since it requires checking approval_status
    // Other filters (date, amount, donorName, paymentMethod) are applied at DB level

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }

    // Apply amount filters
    if (filters.amountMin !== null && filters.amountMin !== undefined) {
      query = query.gte('amount', filters.amountMin.toString())
    }
    if (filters.amountMax !== null && filters.amountMax !== undefined) {
      query = query.lte('amount', filters.amountMax.toString())
    }

    // Apply payment method filter
    if (filters.paymentMethod) {
      // First, try to find payment method by code or ID
      const { data: paymentMethodData } = await supabase
        .from('payment_methods')
        .select('id')
        .or(`code.eq.${filters.paymentMethod},id.eq.${filters.paymentMethod}`)
        .limit(1)
      
      if (paymentMethodData && paymentMethodData.length > 0) {
        query = query.eq('payment_method_id', paymentMethodData[0].id)
      } else {
        // No matching payment method, return empty
        return NextResponse.json({
          contributions: [],
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          stats: await calculateStats(supabase, userId, isAdmin, logger)
        })
      }
    }

    // Apply donor name filter - need to join with users
    if (filters.donorName) {
      // Get user IDs matching the donor name
      const { data: matchingUsers } = await supabase
        .from('users')
        .select('id')
        .or(`first_name.ilike.%${filters.donorName}%,last_name.ilike.%${filters.donorName}%,email.ilike.%${filters.donorName}%`)
      
      if (matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map((u: any) => u.id)
        query = query.in('donor_id', userIds)
      } else {
        // No matching users, return empty
        return NextResponse.json({
          contributions: [],
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          stats: await calculateStats(supabase, userId, isAdmin, logger)
        })
      }
    }

    // Apply sorting
    query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })

    // Check if we need to apply in-memory filters (status filter or search filter)
    // If so, we need to fetch all results first to get accurate count, then paginate
    const needsInMemoryFiltering = statusFilterApplied || (filters.search && filters.search.trim())
    
    // Fetch data - if we need in-memory filtering, fetch all results first
    const fetchQuery = needsInMemoryFiltering 
      ? query  // Fetch all for in-memory filtering
      : query.range(filters.offset, filters.offset + filters.limit - 1)  // Fetch paginated
    
    const { data: contributions, error, count } = await fetchQuery

    if (error) {
      logger.error('Error in direct query fallback:', error, {
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint
      })
      throw new Error(`Database query failed: ${error.message || 'Unknown error'}`)
    }

    if (!contributions || contributions.length === 0) {
      return NextResponse.json({
        contributions: [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count || 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        },
        stats: await calculateStats(supabase, userId, isAdmin, logger)
      })
    }

    // Fetch related data separately to avoid join issues
    interface Contribution {
      case_id?: string | null
      donor_id?: string | null
      id: string
    }
    const caseIds = [...new Set(contributions.map((c: Contribution) => c.case_id).filter(Boolean) as string[])]
    const donorIds = [...new Set(contributions.map((c: Contribution) => c.donor_id).filter(Boolean) as string[])]
    const contributionIds = contributions.map((c) => c.id)

    // Fetch cases (only if we have case IDs)
    let cases: Array<{ id: string; [key: string]: unknown }> = []
    if (caseIds.length > 0) {
      const { data: casesData } = await supabase
        .from('cases')
        .select('id, title_en, title_ar')
        .in('id', caseIds)
      cases = casesData || []
    }

    // Fetch users (only if we have donor IDs)
    let users: Array<{ id: string; [key: string]: unknown }> = []
    if (donorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .in('id', donorIds)
      users = usersData || []
    }

    // Fetch approval statuses (only if we have contribution IDs)
    let approvalStatuses: Array<{ contribution_id: string; status: string; [key: string]: unknown }> = []
    if (contributionIds.length > 0) {
      const { data: approvalData, error: approvalError } = await supabase
        .from('contribution_approval_status')
        .select('*')
        .in('contribution_id', contributionIds)
        .order('created_at', { ascending: false })
      
      if (approvalError) {
        logger.error('Error fetching approval statuses:', approvalError)
      } else {
        approvalStatuses = approvalData || []
        logger.debug('Fetched approval statuses:', {
          count: approvalStatuses.length,
          contributionIds: contributionIds.length,
          sample: approvalStatuses.slice(0, 3).map(a => ({
            contribution_id: a.contribution_id,
            status: a.status
          }))
        })
      }
    }

    // Create lookup maps
    const casesMap = new Map(cases.map((c) => [c.id, c]))
    const usersMap = new Map(users.map((u) => [u.id, u]))
    
    // Group approval statuses by contribution_id
    // Keep only the latest status for each contribution (already sorted by created_at desc)
    const latestStatusMap = new Map<string, { status: string; [key: string]: unknown }>()
    approvalStatuses.forEach((approval) => {
      const contribId = approval.contribution_id
      // Only keep the first (latest) status for each contribution
      if (!latestStatusMap.has(contribId)) {
        latestStatusMap.set(contribId, approval)
      }
    })
    
    // Convert to array format for compatibility with existing code
    const approvalMap = new Map<string, Array<{ status: string; [key: string]: unknown }>>()
    latestStatusMap.forEach((approval, contribId) => {
      approvalMap.set(contribId, [approval])
    })
    
    logger.debug('Approval status mapping:', {
      totalContributions: contributions.length,
      contributionsWithApprovalStatus: approvalMap.size,
      contributionsWithoutApprovalStatus: contributions.length - approvalMap.size,
      sampleMappings: Array.from(approvalMap.entries()).slice(0, 5).map(([id, statuses]) => ({
        contributionId: id,
        status: statuses[0]?.status || 'none'
      }))
    })

    // Combine data and apply filters
    interface EnrichedContribution extends Contribution {
      cases?: { title_en?: string; title_ar?: string } | null
      users?: { id?: string; email?: string; first_name?: string; last_name?: string; phone?: string; [key: string]: unknown } | null
      approval_status?: Array<{ status?: string; [key: string]: unknown }>
      [key: string]: unknown
    }
    let enrichedContributions: EnrichedContribution[] = contributions.map((c: Contribution) => {
      const caseData = casesMap.get(c.case_id || '')
      const userData = usersMap.get(c.donor_id || '')
      const approvals = approvalMap.get(c.id) || []
      
      // Get latest approval status
      const latestApproval = approvals.length > 0 ? approvals[0] : null
      
      return {
        ...c,
        cases: caseData ? { title_en: caseData.title_en as string | undefined, title_ar: caseData.title_ar as string | undefined } : null,
        users: userData || null,
        approval_status: latestApproval ? [latestApproval] : []
      }
    })

    // Apply status filter in memory (requires approval_status check)
    if (statusFilterApplied && statusFilteredIds !== null) {
      const statusFilter = filters.status!.toLowerCase().trim()
      
      if (statusFilter === 'pending') {
        // Exclude contributions with approved/rejected status
        enrichedContributions = enrichedContributions.filter((c: EnrichedContribution) => {
          return !statusFilteredIds!.has(c.id)
        })
      } else {
        // Include only contributions with matching status
        enrichedContributions = enrichedContributions.filter((c: EnrichedContribution) => {
          return statusFilteredIds!.has(c.id)
        })
      }
      
      logger.info('Status filter applied in memory:', {
        status: filters.status,
        beforeFilter: contributions.length,
        afterFilter: enrichedContributions.length
      })
    }

    // Apply search filter in memory (searches across case titles and donor names)
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase()
      enrichedContributions = enrichedContributions.filter((c: EnrichedContribution) => {
        const caseTitleEn = (c.cases?.title_en as string | undefined)?.toLowerCase() || ''
        const caseTitleAr = (c.cases?.title_ar as string | undefined)?.toLowerCase() || ''
        const caseTitle = caseTitleEn || caseTitleAr
        const userData = c.users as { email?: string; first_name?: string; last_name?: string } | null | undefined
        const donorEmail = userData?.email?.toLowerCase() || ''
        const donorFirstName = userData?.first_name?.toLowerCase() || ''
        const donorLastName = userData?.last_name?.toLowerCase() || ''
        return caseTitle.includes(searchLower) ||
               donorEmail.includes(searchLower) ||
               donorFirstName.includes(searchLower) ||
               donorLastName.includes(searchLower)
      })
    }

    // Calculate total after all filters are applied
    // If we applied in-memory filters, use the filtered count
    // Otherwise, use the database count (which should be accurate for DB-level filters)
    const totalAfterAllFilters = needsInMemoryFiltering 
      ? enrichedContributions.length 
      : (count || 0)
    
    // Apply pagination if we fetched all results for in-memory filtering
    let paginatedContributions = enrichedContributions
    if (needsInMemoryFiltering) {
      const startIndex = filters.offset
      const endIndex = startIndex + filters.limit
      paginatedContributions = enrichedContributions.slice(startIndex, endIndex)
    }
    // Otherwise, pagination was already applied at database level

    // Normalize contributions
    const normalizedContributions = paginatedContributions.map((c: EnrichedContribution) => {
      const approvalArray = Array.isArray(c.approval_status) 
        ? c.approval_status 
        : (c.approval_status ? [c.approval_status] : [])
      const userData = c.users as { first_name?: string; last_name?: string; email?: string; id?: string; phone?: string } | null | undefined
      const donorFirst = userData?.first_name || ''
      const donorLast = userData?.last_name || ''
      const donorName = `${donorFirst} ${donorLast}`.trim() || userData?.email || 'Anonymous'

      return {
        id: c.id,
        amount: typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount as number),
        status: c.status as string,
        notes: (c.notes as string | undefined) || null,
        message: (c.message as string | undefined) || null,
        anonymous: !!(c.anonymous as boolean | undefined),
        payment_method: (c.payment_methods as { code?: string } | undefined)?.code || (c.payment_method as string | undefined) || (c.payment_method_id as string | undefined) || null,
        payment_method_id: (c.payment_method_id as string | undefined) || null,
        payment_method_name: (c.payment_methods as { name_en?: string; name?: string } | undefined)?.name_en || (c.payment_methods as { name?: string } | undefined)?.name || null,
        payment_method_name_ar: (c.payment_methods as { name_ar?: string } | undefined)?.name_ar || null,
        createdAt: (c.created_at as string | undefined) || null,
        updatedAt: (c.updated_at as string | undefined) || null,
        caseId: c.case_id || null,
        caseTitle: (c.cases?.title_en as string | undefined) || (c.cases?.title_ar as string | undefined) || '',
        donorName,
        donorId: userData?.id || null,
        donorEmail: userData?.email || null,
        donorFirstName: userData?.first_name || null,
        donorLastName: userData?.last_name || null,
        donorPhone: userData?.phone || null,
        proofUrl: (c.proof_url as string | undefined) || (c.proof_of_payment as string | undefined) || null,
        approval_status: approvalArray.map((approval) => ({
          ...approval,
          created_at: (approval.created_at as string | undefined) || null,
          updated_at: (approval.updated_at as string | undefined) || null,
        }))
      }
    })

    const stats = await calculateStats(supabase, userId, isAdmin, logger)

    return NextResponse.json({
      contributions: normalizedContributions,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalAfterAllFilters,
        totalPages: Math.ceil(totalAfterAllFilters / filters.limit),
        hasNextPage: filters.offset + filters.limit < totalAfterAllFilters,
        hasPreviousPage: filters.page > 1
      },
      stats
    })
  } catch (error) {
    logger.error('Error in getContributionsDirectQuery:', error)
    throw error
  }
}

/**
 * Calculate contribution statistics
 */
/**
 * Calculate contribution statistics dynamically
 * Always fetches ALL contributions regardless of filters
 * Groups by status dynamically to handle any status values
 */
async function calculateStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isAdmin: boolean,
  logger: Logger
) {
  try {
    // Fetch ALL contributions with their approval status
    // Use contribution_approval_status.status as the source of truth
    // This ensures stats always show overall counts regardless of current filter
    let statsQuery = supabase
      .from('contributions')
      .select(`
        id,
        amount,
        status,
        contribution_approval_status(
          status,
          created_at
        )
      `)
    
    // Only filter by user if not admin (for user's own contributions)
    if (!isAdmin) {
      statsQuery = statsQuery.eq('donor_id', userId)
    }
    
    const { data: statsData, error: statsError } = await statsQuery

    if (statsError) {
      logger.error('Error fetching stats data:', statsError)
      throw statsError
    }

    // Initialize stats with all possible status values
    // Use a dynamic map to count all status types
    const statusCounts = new Map<string, number>()
    let totalAmount = 0

    interface StatsContribution {
      amount?: string | number
      status?: string | null
      contribution_approval_status?: Array<{ status?: string; created_at?: string }> | { status?: string; created_at?: string } | null
    }
    
    // Simple helper to get status from approval_status or default to pending
    const getStatusFromContribution = (c: StatsContribution): string => {
      // Check if there's an approval_status
      if (c.contribution_approval_status) {
        const approvalStatusArray = Array.isArray(c.contribution_approval_status) 
          ? c.contribution_approval_status 
          : [c.contribution_approval_status]
        
        // Get the latest approval status (sorted by created_at desc)
        const latestApproval = approvalStatusArray
          .filter(a => a && a.status && typeof a.status === 'string')
          .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateB - dateA
          })[0]
        
        if (latestApproval && latestApproval.status) {
          return String(latestApproval.status).toLowerCase().trim()
        }
      }
      
      // No approval_status = pending
      return 'pending'
    }
    
    // Count contributions by status - simple and consistent
    statsData?.forEach((contribution: StatsContribution) => {
      const status = getStatusFromContribution(contribution)
      
      // Increment count for this status
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
      
      // Sum amounts for approved contributions only
      if (status === 'approved') {
        const amountValue = typeof contribution.amount === 'number' 
          ? contribution.amount 
          : parseFloat(String(contribution.amount || '0'))
        totalAmount += amountValue
      }
    })
    
    // Log all unique statuses found for debugging
    const uniqueStatuses = Array.from(statusCounts.keys())
    
    // Also get a sample of actual status values to verify
    const statusSamples = new Map<string, number>()
    statsData?.slice(0, 100).forEach((c: StatsContribution) => {
      const s = (c.status || 'null').toLowerCase()
      statusSamples.set(s, (statusSamples.get(s) || 0) + 1)
    })
    
    logger.info('Status distribution found:', {
      uniqueStatuses,
      statusCounts: Object.fromEntries(statusCounts),
      totalContributions: statsData?.length || 0,
      sampleStatusDistribution: Object.fromEntries(statusSamples),
      calculatedStats: {
        total: statsData?.length || 0,
        pending: statusCounts.get('pending') || 0,
        approved: statusCounts.get('approved') || 0,
        rejected: statusCounts.get('rejected') || 0
      }
    })

    // Build stats object with standard statuses
    // This ensures compatibility with frontend expectations
    const stats = {
      total: statsData?.length || 0,
      pending: statusCounts.get('pending') || 0,
      approved: statusCounts.get('approved') || 0,
      rejected: statusCounts.get('rejected') || 0,
      totalAmount,
      // Include any other status types found (for future extensibility)
      ...Object.fromEntries(
        Array.from(statusCounts.entries())
          .filter(([status]) => !['pending', 'approved', 'rejected'].includes(status))
          .map(([status, count]) => [status, count])
      )
    }

    logger.debug('Calculated stats:', {
      total: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      totalAmount: stats.totalAmount,
      contributionsCount: statsData?.length || 0,
      allStatusCounts: Object.fromEntries(statusCounts)
    })

    return stats
  } catch (error) {
    logger.error('Error calculating stats:', error)
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0
    }
  }
}
    
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()
    const { caseId, amount, message, anonymous, paymentMethod, proofOfPayment } = body

    if (!caseId || !amount || !paymentMethod) {
      throw new ApiError('VALIDATION_ERROR', 'Missing required fields: caseId, amount, and paymentMethod are required', 400)
    }

    // Convert payment method code to UUID if needed
    let paymentMethodId: string | null = null
    
    // If paymentMethod is already a UUID, use it directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(paymentMethod)) {
      paymentMethodId = paymentMethod
    } else {
      // Otherwise, look up by code
      const { data: paymentMethodData, error: pmError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('code', paymentMethod)
        .eq('is_active', true)
        .single()

      if (pmError || !paymentMethodData) {
        logger.error('Payment method lookup error:', pmError)
        throw new ApiError('VALIDATION_ERROR', `Invalid payment method: ${paymentMethod}`, 400)
      }

      paymentMethodId = paymentMethodData.id
    }

    if (amount <= 0) {
      throw new ApiError('VALIDATION_ERROR', 'Amount must be greater than 0', 400)
    }

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    if (caseData.status !== 'published') {
      throw new ApiError('VALIDATION_ERROR', 'Case is not published and cannot accept contributions', 400)
    }

    const { data: contribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: amount,
        payment_method_id: paymentMethodId,
        status: 'pending',
        proof_of_payment: proofOfPayment || null,
        anonymous: anonymous || false,
        donor_id: user.id,
        case_id: caseId,
        notes: message || null,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error inserting contribution:', insertError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create contribution', 500)
    }

    // Update case amount (non-blocking)
    try {
    const { data: currentCase } = await supabase
      .from('cases')
      .select('current_amount')
      .eq('id', caseId)
      .single()
    
    if (currentCase) {
      const newAmount = parseFloat(currentCase.current_amount || '0') + parseFloat(amount)
        await supabase
        .from('cases')
        .update({ current_amount: newAmount.toString() })
        .eq('id', caseId)
      }
    } catch (updateError) {
      logger.warn('Error updating case amount (non-critical):', updateError)
    }

    // Create notifications (non-blocking)
    try {
      const { createBilingualNotification, NOTIFICATION_TEMPLATES } = await import('@/lib/notifications/bilingual-helpers')
      
      const { data: admins } = await supabase
        .from('admin_user_roles')
        .select('user_id, admin_roles!inner(name)')
        .eq('is_active', true)
        .in('admin_roles.name', ['admin', 'super_admin'])

      if (admins && admins.length > 0) {
        const caseTitle = caseData.title_en || caseData.title_ar || 'Unknown Case'
        const content = createBilingualNotification(
          NOTIFICATION_TEMPLATES.newContributionSubmitted.title_en,
          NOTIFICATION_TEMPLATES.newContributionSubmitted.title_ar,
          NOTIFICATION_TEMPLATES.newContributionSubmitted.message_en,
          NOTIFICATION_TEMPLATES.newContributionSubmitted.message_ar,
          { amount, caseTitle }
        )

        const notifications = admins.map((admin: any) => ({
          type: 'contribution_pending',
          recipient_id: admin.user_id,
          title_en: content.title_en,
          title_ar: content.title_ar,
          message_en: content.message_en,
          message_ar: content.message_ar,
          // Legacy fields for backward compatibility
          title: content.title_en,
          message: content.message_en,
          data: {
            contribution_id: contribution.id,
            case_id: caseId,
            case_title: caseTitle,
            amount: amount
          },
          read: false
        }))

        await supabase.from('notifications').insert(notifications)
      }
    } catch (notificationError) {
      logger.warn('Error creating notifications (non-critical):', notificationError)
    }

    return NextResponse.json(contribution, { status: 201 })
}

export const GET = createGetHandler(getHandler, { requireAuth: true, loggerContext: 'api/contributions' })
export const POST = createPostHandler(postHandler, { requireAuth: true, loggerContext: 'api/contributions' })

    