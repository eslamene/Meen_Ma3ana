/**
 * Contribution Service
 * Handles all contribution-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import type { ContributionRow, NormalizedContribution } from '@/types/contribution'

const CASE_EMBED_SELECT = 'cases:case_id(title_en, title_ar)'

export interface ContributionSearchParams {
  status?: string | null
  search?: string | null
  dateFrom?: Date | null
  dateTo?: Date | null
  amountMin?: number | null
  amountMax?: number | null
  donorName?: string | null
  paymentMethod?: string | null
  sortBy?: string
  sortOrder?: string
  page?: number
  limit?: number
  offset?: number
  userId?: string
  isAdmin?: boolean
}

export interface ContributionListResponse {
  contributions: NormalizedContribution[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  stats?: {
    totalContributions: number
    totalAmount: number
    approvedContributions: number
    approvedAmount: number
    pendingContributions: number
    pendingAmount: number
  }
}

export class ContributionService {
  /**
   * Get contributions with filtering and pagination
   * @param supabase - Supabase client (server-side only)
   */
  static async getContributions(
    supabase: SupabaseClient,
    params: ContributionSearchParams
  ): Promise<ContributionListResponse> {
    const {
      status,
      search,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      donorName,
      paymentMethod,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      offset = 0,
      userId,
      isAdmin = false,
    } = params

    // Try to use RPC function first if no advanced filters
    const hasAdvancedFilters = !!(amountMin || amountMax || donorName || paymentMethod)
    
    if (!hasAdvancedFilters) {
      try {
        const { data: contributions, error: rpcError } = await supabase.rpc('search_contributions', {
          p_user_id: userId || null,
          p_is_admin: isAdmin,
          p_status: status || null,
          p_search: search?.trim() || null,
          p_date_from: dateFrom?.toISOString() || null,
          p_date_to: dateTo?.toISOString() || null,
          p_sort_by: sortBy,
          p_sort_order: sortOrder,
          p_limit: limit,
          p_offset: offset
        })

        if (!rpcError && contributions) {
          // Normalize contributions from RPC
          const normalizedContributions = (contributions || []).map((c: ContributionRow) => this.normalizeContribution(c))
          
          // Get total count
          const { count: totalCount } = await supabase
            .from('contributions')
            .select('*', { count: 'exact', head: true })
            .eq(isAdmin ? '1' : 'donor_id', isAdmin ? '1' : userId || '')

          return {
            contributions: normalizedContributions,
            pagination: {
              page,
              limit,
              total: totalCount || normalizedContributions.length,
              totalPages: Math.ceil((totalCount || normalizedContributions.length) / limit),
              hasNextPage: page < Math.ceil((totalCount || normalizedContributions.length) / limit),
              hasPreviousPage: page > 1
            }
          }
        }
      } catch (rpcError) {
        defaultLogger.warn('RPC function failed, falling back to direct query:', rpcError)
      }
    }

    // Fallback to direct query
    return this.getContributionsDirectQuery(supabase, params)
  }

  /**
   * Get contributions using direct query (fallback method)
   * @param supabase - Supabase client (server-side only)
   */
  private static async getContributionsDirectQuery(
    supabase: SupabaseClient,
    params: ContributionSearchParams
  ): Promise<ContributionListResponse> {
    const {
      status,
      search,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      donorName,
      paymentMethod,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      offset = 0,
      userId,
      isAdmin = false,
    } = params

    let query = supabase
      .from('contributions')
      .select(`
        *,
        ${CASE_EMBED_SELECT},
        users:donor_id(id, email, first_name, last_name, phone),
        approval_status:contribution_approval_status!contribution_id(id, status, rejection_reason, admin_comment, donor_reply, resubmission_count, created_at, updated_at)
      `, { count: 'exact' })

    // Filter by user if not admin
    if (!isAdmin && userId) {
      query = query.eq('donor_id', userId)
    }

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'approved') {
        query = query.eq('approval_status.status', 'approved')
      } else if (status === 'rejected') {
        query = query.in('approval_status.status', ['rejected', 'revised'])
      } else if (status === 'pending') {
        query = query.or('approval_status.status.is.null,approval_status.status.eq.pending')
      }
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString())
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString())
    }

    // Apply amount filters
    if (amountMin) {
      query = query.gte('amount', amountMin)
    }
    if (amountMax) {
      query = query.lte('amount', amountMax)
    }

    // Apply payment method filter
    if (paymentMethod) {
      query = query.eq('payment_method_id', paymentMethod)
    }

    // Apply donor name filter
    if (donorName) {
      const { data: matchingUsers } = await supabase
        .from('users')
        .select('id')
        .or(`first_name.ilike.%${donorName}%,last_name.ilike.%${donorName}%,email.ilike.%${donorName}%`)
      
      if (matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map((u: any) => u.id)
        query = query.in('donor_id', userIds)
      } else {
        // No matching users, return empty
        return {
          contributions: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Check if we need in-memory filtering
    const needsInMemoryFiltering = (status && status !== 'all') || (search && search.trim())
    
    // Fetch data
    const fetchQuery = needsInMemoryFiltering 
      ? query  // Fetch all for in-memory filtering
      : query.range(offset, offset + limit - 1)  // Fetch paginated
    
    const { data: contributions, error, count } = await fetchQuery

    if (error) {
      defaultLogger.error('Error fetching contributions:', error)
      throw new Error(`Database query failed: ${error.message || 'Unknown error'}`)
    }

    // Apply search filter in memory if needed
    let filteredContributions = contributions || []
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filteredContributions = filteredContributions.filter((c: ContributionRow & { users?: { first_name?: string | null; last_name?: string | null; email?: string | null } }) => {
        const caseTitle = ContributionService.resolveCaseTitle(c)
        const donorName = c.users ? 
          `${c.users.first_name || ''} ${c.users.last_name || ''}`.trim() || c.users.email || '' : ''
        return (
          caseTitle.toLowerCase().includes(searchLower) ||
          donorName.toLowerCase().includes(searchLower) ||
          (c.notes || '').toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply pagination if we fetched all
    if (needsInMemoryFiltering) {
      const total = filteredContributions.length
      filteredContributions = filteredContributions.slice(offset, offset + limit)
      
      return {
        contributions: filteredContributions.map((c: any) => this.normalizeContribution(c)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        }
      }
    }

    return {
      contributions: filteredContributions.map((c: any) => this.normalizeContribution(c)),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: page < Math.ceil((count || 0) / limit),
        hasPreviousPage: page > 1
      }
    }
  }

  /**
   * Normalize embedded or flat approval rows for API consumers.
   */
  private static normalizeApprovalStatus(c: ContributionRow): NormalizedContribution['approval_status'] {
    const raw = c.approval_status
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(row => ({
        id: row.id,
        status: row.status || 'pending',
        rejection_reason: row.rejection_reason ?? null,
        admin_comment: row.admin_comment ?? null,
        donor_reply: row.donor_reply ?? null,
        resubmission_count: row.resubmission_count ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      }))
    }
    if (typeof raw === 'string' && raw) {
      return [
        {
          status: raw,
          rejection_reason: c.approval_rejection_reason ?? null,
          admin_comment: c.approval_admin_comment ?? null,
          donor_reply: c.approval_donor_reply ?? null,
          resubmission_count: c.approval_resubmission_count ?? null,
          created_at: c.approval_created_at ?? null,
          updated_at: c.approval_updated_at ?? null,
        },
      ]
    }
    return []
  }

  /**
   * Case title from flat RPC field or embedded `cases` join (title_en / title_ar).
   */
  private static resolveCaseTitle(c: ContributionRow): string {
    if (c.case_title?.trim()) return c.case_title.trim()
    const rel = c.cases
    if (!rel) return ''
    const row = Array.isArray(rel) ? rel[0] : rel
    if (!row) return ''
    const t = row.title_en || row.title_ar || row.title || ''
    return typeof t === 'string' ? t.trim() : ''
  }

  /**
   * Normalize contribution data
   */
  private static normalizeContribution(c: ContributionRow): NormalizedContribution {
    const donorName = c.donor_first_name || c.donor_last_name
      ? `${c.donor_first_name || ''} ${c.donor_last_name || ''}`.trim()
      : c.donor_email || 'Anonymous'

    return {
      id: c.id,
      amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
      status: c.status,
      notes: c.notes || null,
      message: c.message || null,
      anonymous: !!c.anonymous,
      payment_method: c.payment_method || null,
      createdAt: c.created_at || null,
      updatedAt: c.updated_at || null,
      caseId: c.case_id || null,
      caseTitle: this.resolveCaseTitle(c),
      donorName,
      donorId: c.donor_id || null,
      donorEmail: c.donor_email || null,
      donorFirstName: c.donor_first_name || null,
      donorLastName: c.donor_last_name || null,
      donorPhone: c.donor_phone || null,
      proofUrl: c.proof_url || c.proof_of_payment || null,
      approval_status: this.normalizeApprovalStatus(c),
    }
  }

  /**
   * Get contribution by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<NormalizedContribution | null> {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        ${CASE_EMBED_SELECT},
        users:donor_id(id, email, first_name, last_name, phone),
        approval_status:contribution_approval_status!contribution_id(id, status, rejection_reason, admin_comment, donor_reply, resubmission_count, created_at, updated_at)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching contribution:', error)
      throw new Error(`Failed to fetch contribution: ${error.message}`)
    }

    return this.normalizeContribution(data as ContributionRow)
  }

  /**
   * Create a new contribution
   * @param supabase - Supabase client (server-side only)
   */
  static async create(
    supabase: SupabaseClient,
    data: {
      caseId: string
      amount: number
      message?: string | null
      anonymous?: boolean
      paymentMethodId: string
      proofOfPayment?: string | null
      donorId: string
    }
  ): Promise<NormalizedContribution> {
    // Verify case exists and is published
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, status')
      .eq('id', data.caseId)
      .single()

    if (caseError || !caseData) {
      throw new Error('Case not found')
    }

    if (caseData.status !== 'published') {
      throw new Error('Case is not published and cannot accept contributions')
    }

    // Create contribution
    const { data: contribution, error } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: data.amount.toString(),
        payment_method_id: data.paymentMethodId,
        status: 'pending',
        proof_of_payment: data.proofOfPayment || null,
        anonymous: data.anonymous || false,
        donor_id: data.donorId,
        case_id: data.caseId,
        notes: data.message || null,
      })
      .select(`
        *,
        ${CASE_EMBED_SELECT},
        users:donor_id(id, email, first_name, last_name, phone)
      `)
      .single()

    if (error) {
      defaultLogger.error('Error creating contribution:', error)
      throw new Error(`Failed to create contribution: ${error.message}`)
    }

    // Update case amount (non-blocking)
    try {
      const { data: currentCase } = await supabase
        .from('cases')
        .select('current_amount')
        .eq('id', data.caseId)
        .single()
      
      if (currentCase) {
        const newAmount = parseFloat(currentCase.current_amount || '0') + data.amount
        await supabase
          .from('cases')
          .update({ current_amount: newAmount.toString() })
          .eq('id', data.caseId)
      }
    } catch (updateError) {
      defaultLogger.warn('Error updating case amount (non-critical):', updateError)
    }

    return this.normalizeContribution(contribution as ContributionRow)
  }

  /**
   * Create an admin-recorded contribution (pre-paid), approved immediately.
   */
  static async createAdminContribution(
    supabase: SupabaseClient,
    data: {
      caseId: string
      donorId: string
      amount: number
      paymentMethodId: string
      proofOfPayment?: string | null
      anonymous?: boolean
      notes?: string | null
      adminId: string
    }
  ): Promise<{ contribution: NormalizedContribution; approvalStatusCreated: boolean }> {
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, status')
      .eq('id', data.caseId)
      .single()

    if (caseError || !caseData) {
      throw new Error('Case not found')
    }

    const { data: contribution, error } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: data.amount.toString(),
        payment_method_id: data.paymentMethodId,
        status: 'approved',
        proof_of_payment: data.proofOfPayment || null,
        anonymous: data.anonymous || false,
        donor_id: data.donorId,
        case_id: data.caseId,
        notes: data.notes || null,
      })
      .select(
        `
        *,
        ${CASE_EMBED_SELECT},
        users:donor_id(id, email, first_name, last_name, phone)
      `
      )
      .single()

    if (error) {
      defaultLogger.error('Error creating admin contribution:', error)
      throw new Error(`Failed to create contribution: ${error.message}`)
    }

    let approvalStatusCreated = false
    const { error: apprErr } = await supabase.from('contribution_approval_status').insert({
      contribution_id: contribution.id,
      status: 'approved',
      admin_id: data.adminId,
    })

    if (apprErr) {
      defaultLogger.error('Error creating approval status for admin contribution:', apprErr)
    } else {
      approvalStatusCreated = true
    }

    try {
      const { data: currentCase } = await supabase
        .from('cases')
        .select('current_amount')
        .eq('id', data.caseId)
        .single()

      if (currentCase) {
        const newAmount = parseFloat(String(currentCase.current_amount || '0')) + data.amount
        await supabase.from('cases').update({ current_amount: newAmount.toString() }).eq('id', data.caseId)
      }
    } catch (updateError) {
      defaultLogger.warn('Error updating case amount after admin contribution:', updateError)
    }

    const full = await this.getById(supabase, contribution.id)
    if (!full) {
      throw new Error('Failed to load created contribution')
    }

    return { contribution: full, approvalStatusCreated }
  }

  /**
   * Calculate contribution statistics
   * @param supabase - Supabase client (server-side only)
   */
  static async getStats(
    supabase: SupabaseClient,
    userId: string,
    isAdmin: boolean
  ): Promise<{
    totalContributions: number
    totalAmount: number
    approvedContributions: number
    approvedAmount: number
    pendingContributions: number
    pendingAmount: number
  }> {
    let query = supabase
      .from('contributions')
      .select('amount, status, approval_status:contribution_approval_status!contribution_id(status)')

    if (!isAdmin) {
      query = query.eq('donor_id', userId)
    }

    const { data: contributions, error } = await query

    if (error) {
      defaultLogger.error('Error calculating stats:', error)
      return {
        totalContributions: 0,
        totalAmount: 0,
        approvedContributions: 0,
        approvedAmount: 0,
        pendingContributions: 0,
        pendingAmount: 0
      }
    }

    const allContributions = contributions || []
    const totalContributions = allContributions.length
    const totalAmount = allContributions.reduce((sum, c) => sum + (parseFloat(c.amount || '0') || 0), 0)

    const approvedContributions = allContributions.filter((c: any) => {
      const approvalStatus = c.approval_status
      if (Array.isArray(approvalStatus)) {
        return approvalStatus.length > 0 && approvalStatus[0]?.status === 'approved'
      }
      return approvalStatus && approvalStatus.status === 'approved'
    })
    const approvedAmount = approvedContributions.reduce((sum, c) => sum + (parseFloat(c.amount || '0') || 0), 0)

    const pendingContributions = allContributions.filter((c: any) => {
      const approvalStatus = c.approval_status
      if (!approvalStatus || (Array.isArray(approvalStatus) && approvalStatus.length === 0)) {
        return true
      }
      if (Array.isArray(approvalStatus)) {
        return approvalStatus[0]?.status === 'pending' || !approvalStatus[0]?.status
      }
      return approvalStatus.status === 'pending' || !approvalStatus.status
    })
    const pendingAmount = pendingContributions.reduce((sum, c) => sum + (parseFloat(c.amount || '0') || 0), 0)

    return {
      totalContributions,
      totalAmount,
      approvedContributions: approvedContributions.length,
      approvedAmount,
      pendingContributions: pendingContributions.length,
      pendingAmount
    }
  }

  /**
   * Get case progress statistics (approved contributions total and contributor count)
   * @param supabase - Supabase client (server-side only)
   * @param caseId - Case ID
   */
  static async getCaseProgress(
    supabase: SupabaseClient,
    caseId: string
  ): Promise<{
    approvedTotal: number
    contributorCount: number
  }> {
    // Get all approved contributions for this case
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select(`
        id,
        amount,
        donor_id,
        status,
        approval_status:contribution_approval_status!contribution_id(status)
      `)
      .eq('case_id', caseId)
      .eq('status', 'approved')

    if (error) {
      defaultLogger.error('Error fetching case progress:', error)
      throw new Error(`Failed to fetch case progress: ${error.message}`)
    }

    // Filter to only approved contributions (check approval_status)
    const approvedContributions = (contributions || []).filter((c: any) => {
      const approvalStatus = c.approval_status
      if (!approvalStatus) return false
      if (Array.isArray(approvalStatus)) {
        return approvalStatus[0]?.status === 'approved'
      }
      return approvalStatus.status === 'approved'
    })

    // Calculate total approved amount
    const approvedTotal = approvedContributions.reduce(
      (sum, c) => sum + (parseFloat(c.amount || '0') || 0),
      0
    )

    // Get unique contributor count
    const uniqueDonors = new Set(
      approvedContributions.map((c: any) => c.donor_id).filter(Boolean)
    )
    const contributorCount = uniqueDonors.size

    return {
      approvedTotal,
      contributorCount
    }
  }

  /**
   * Sum all contribution amounts for a case (every row visible to the caller; RLS applies).
   */
  static async sumAmountsForCaseAllStatuses(supabase: SupabaseClient, caseId: string): Promise<number> {
    const { data, error } = await supabase.from('contributions').select('amount').eq('case_id', caseId)

    if (error) {
      defaultLogger.error('Error summing contributions for case:', error)
      throw new Error(`Failed to sum contributions: ${error.message}`)
    }

    return (data || []).reduce(
      (sum, c) => sum + parseFloat(String((c as { amount?: string | number }).amount || 0)),
      0
    )
  }

  /**
   * Get admin dashboard contribution statistics
   * @param supabase - Supabase client (server-side only)
   */
  static async getAdminStats(supabase: SupabaseClient): Promise<{
    totalContributions: number
    totalAmount: number
    pendingContributions: number
    approvedContributions: number
    rejectedContributions: number
    recentActivity: Array<{
      id: string
      type: string
      status: string
      amount: number
      date: string
    }>
  }> {
    // Fetch contributions with approval status
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select(`
        id,
        amount,
        status,
        created_at,
        approval_status:contribution_approval_status!contribution_id(status)
      `)
      .limit(10000) // Add limit to prevent timeout

    if (error) {
      defaultLogger.error('Error fetching admin contribution stats:', error)
      throw new Error(`Failed to fetch contribution stats: ${error.message}`)
    }

    const allContributions = (contributions || []) as Array<{
      id: string
      amount: string | number
      status: string
      created_at: string
      approval_status?: {
        status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
      } | Array<{
        status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
      }>
    }>

    // Helper to get approval status
    const getApprovalStatus = (c: typeof allContributions[0]): string => {
      if (c.approval_status !== undefined && c.approval_status !== null) {
        const approvalStatus = Array.isArray(c.approval_status)
          ? c.approval_status[0]?.status
          : c.approval_status?.status || 'pending'
        return approvalStatus
      }
      return c.status || 'pending'
    }

    // Calculate total amount from approved contributions only
    const totalAmount = allContributions.reduce((sum, c) => {
      const approvalStatus = getApprovalStatus(c)
      return approvalStatus === 'approved' ? sum + parseFloat(String(c.amount || 0)) : sum
    }, 0)

    // Calculate counts
    const pendingContributions = allContributions.filter(c => {
      const approvalStatus = getApprovalStatus(c)
      return approvalStatus === 'pending'
    }).length

    const approvedContributions = allContributions.filter(c => {
      const approvalStatus = getApprovalStatus(c)
      return approvalStatus === 'approved'
    }).length

    const rejectedContributions = allContributions.filter(c => {
      const approvalStatus = getApprovalStatus(c)
      return approvalStatus === 'rejected'
    }).length

    // Get recent activity (last 10 approved contributions)
    const recentActivity = allContributions
      .filter(c => {
        const approvalStatus = getApprovalStatus(c)
        return approvalStatus === 'approved'
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        type: 'contribution',
        status: c.status,
        amount: parseFloat(String(c.amount || 0)),
        date: c.created_at
      }))

    return {
      totalContributions: allContributions.length,
      totalAmount,
      pendingContributions,
      approvedContributions,
      rejectedContributions,
      recentActivity
    }
  }
}

