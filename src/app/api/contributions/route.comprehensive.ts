import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * Comprehensive GET handler for contributions API
 * Uses database functions for efficient search and filtering
 */
export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100) // Max 100 per page
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const isAdmin = searchParams.get('admin') === 'true'
    
    const offset = (page - 1) * limit

    // Validate pagination
    if (page < 1) {
      return NextResponse.json({ 
        error: 'Page must be greater than 0' 
      }, { status: 400 })
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json({ 
        error: 'Limit must be between 1 and 100' 
      }, { status: 400 })
    }

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Use database function for efficient search
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
      logger.error('Error searching contributions:', searchError, {
        query: 'GET /api/contributions',
        userId: user.id,
        isAdmin: isActuallyAdmin,
        errorCode: searchError.code,
        errorDetails: searchError.details,
        errorHint: searchError.hint
      })
      
      // Fallback to direct query if function doesn't exist
      logger.info('Falling back to direct query method')
      return await getContributionsDirectQuery(
        supabase,
        user.id,
        isActuallyAdmin,
        { status, search, dateFrom: parsedDateFrom, dateTo: parsedDateTo, sortBy, sortOrder, page, limit, offset },
        logger
      )
    }

    // Get total count for pagination
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
    const normalizedContributions = (contributions || []).map((c: any) => {
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
  } catch (error) {
    logger.error('Unexpected error in GET /api/contributions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

/**
 * Fallback method using direct Supabase queries
 * Used when database functions are not available
 */
async function getContributionsDirectQuery(
  supabase: any,
  userId: string,
  isAdmin: boolean,
  filters: {
    status?: string | null
    search?: string | null
    dateFrom?: Date | null
    dateTo?: Date | null
    sortBy: string
    sortOrder: string
    page: number
    limit: number
    offset: number
  },
  logger: Logger
) {
  let query = supabase
    .from('contributions')
    .select(`
      *,
      cases:case_id(title),
      users:donor_id(id, email, first_name, last_name, phone),
      approval_status:contribution_approval_status!contribution_id(status, rejection_reason, admin_comment, donor_reply, resubmission_count, created_at, updated_at)
    `, { count: 'exact' })

  // Filter by user if not admin
  if (!isAdmin) {
    query = query.eq('donor_id', userId)
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'approved') {
      query = query.eq('approval_status.status', 'approved')
    } else if (filters.status === 'rejected') {
      query = query.in('approval_status.status', ['rejected', 'revised'])
    } else if (filters.status === 'pending') {
      query = query.or('approval_status.status.is.null,approval_status.status.eq.pending')
    }
  }

  // Apply date filters
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString())
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString())
  }

  // Apply sorting
  query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })

  // Fetch all if searching (will filter in memory)
  if (!filters.search || !filters.search.trim()) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data: contributions, error, count } = await query

  if (error) {
    throw error
  }

  // Apply search filter in memory
  let filteredContributions = contributions || []
  if (filters.search && filters.search.trim()) {
    const searchLower = filters.search.toLowerCase()
    filteredContributions = filteredContributions.filter((c: any) => {
      const caseTitleEn = c.cases?.title_en?.toLowerCase() || ''
      const caseTitleAr = c.cases?.title_ar?.toLowerCase() || ''
      const caseTitle = caseTitleEn || caseTitleAr
      const donorEmail = c.users?.email?.toLowerCase() || ''
      const donorFirstName = c.users?.first_name?.toLowerCase() || ''
      const donorLastName = c.users?.last_name?.toLowerCase() || ''
      return caseTitle.includes(searchLower) ||
             donorEmail.includes(searchLower) ||
             donorFirstName.includes(searchLower) ||
             donorLastName.includes(searchLower)
    })
    
    // Apply pagination after filtering
    filteredContributions = filteredContributions.slice(
      filters.offset,
      filters.offset + filters.limit
    )
  }

  // Normalize contributions
  const normalizedContributions = filteredContributions.map((c: any) => {
    const approvalArray = Array.isArray(c.approval_status) 
      ? c.approval_status 
      : (c.approval_status ? [c.approval_status] : [])
    const donorFirst = c.users?.first_name || ''
    const donorLast = c.users?.last_name || ''
    const donorName = `${donorFirst} ${donorLast}`.trim() || c.users?.email || 'Anonymous'

    return {
      id: c.id,
      amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
      status: c.status,
      notes: c.notes || null,
      message: c.message || null,
      anonymous: !!c.anonymous,
      payment_method: c.payment_method || c.payment_method_id || null,
      createdAt: c.created_at || null,
      updatedAt: c.updated_at || null,
      caseId: c.case_id || null,
      caseTitle: c.cases?.title_en || c.cases?.title_ar || '',
      donorName,
      donorId: c.users?.id || null,
      donorEmail: c.users?.email || null,
      donorFirstName: c.users?.first_name || null,
      donorLastName: c.users?.last_name || null,
      donorPhone: c.users?.phone || null,
      proofUrl: c.proof_url || c.proof_of_payment || null,
      approval_status: approvalArray.map((approval: any) => ({
        ...approval,
        created_at: approval.created_at || null,
        updated_at: approval.updated_at || null,
      }))
    }
  })

  const stats = await calculateStats(supabase, userId, isAdmin, logger)
  const totalCount = filters.search && filters.search.trim() 
    ? normalizedContributions.length 
    : (count || 0)

  return NextResponse.json({
    contributions: normalizedContributions,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / filters.limit),
      hasNextPage: filters.page < Math.ceil(totalCount / filters.limit),
      hasPreviousPage: filters.page > 1
    },
    stats
  })
}

/**
 * Calculate contribution statistics
 */
async function calculateStats(
  supabase: any,
  userId: string,
  isAdmin: boolean,
  logger: Logger
) {
  try {
    let statsQuery = supabase
      .from('contributions')
      .select(`
        id,
        amount,
        approval_status:contribution_approval_status!contribution_id(status)
      `)
    
    if (!isAdmin) {
      statsQuery = statsQuery.eq('donor_id', userId)
    }
    
    const { data: statsData } = await statsQuery

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0
    }

    statsData?.forEach((contribution: any) => {
      const approvalStatusArray = contribution.approval_status
      const approvalStatus = Array.isArray(approvalStatusArray) && approvalStatusArray.length > 0 
        ? approvalStatusArray[0]?.status || 'pending'
        : 'pending'
      
      if (approvalStatus === 'approved') {
        stats.approved++
        stats.totalAmount += parseFloat(contribution.amount || '0')
      } else if (approvalStatus === 'rejected' || approvalStatus === 'revised') {
        stats.rejected++
      } else {
        stats.pending++
      }
    })

    stats.total = stats.approved + stats.pending + stats.rejected

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

// POST handler remains the same as before
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
    const { caseId, amount, message, anonymous, paymentMethod, proofOfPayment } = body

    if (!caseId || !amount || !paymentMethod) {
      return NextResponse.json({ 
        error: 'Missing required fields: caseId, amount, and paymentMethod are required' 
      }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be greater than 0' 
      }, { status: 400 })
    }

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ 
        error: 'Case not found' 
      }, { status: 404 })
    }

    if (caseData.status !== 'published') {
      return NextResponse.json({ 
        error: 'Case is not published and cannot accept contributions' 
      }, { status: 400 })
    }

    const { data: contribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: amount,
        payment_method: paymentMethod,
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
      return NextResponse.json({ 
        error: 'Failed to create contribution' 
      }, { status: 500 })
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
      const { data: admins } = await supabase
        .from('admin_user_roles')
        .select('user_id, admin_roles!inner(name)')
        .eq('is_active', true)
        .in('admin_roles.name', ['admin', 'super_admin'])

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: any) => ({
          type: 'contribution_pending',
          recipient_id: admin.user_id,
          title: 'New Contribution Submitted',
          message: `A new contribution of ${amount} EGP has been submitted for case: ${caseData.title}`,
          data: {
            contribution_id: contribution.id,
            case_id: caseId,
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

  } catch (error) {
    logger.error('Error in POST /api/contributions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

