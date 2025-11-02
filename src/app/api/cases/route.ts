import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caseUpdateService } from '@/lib/case-updates'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const minAmount = searchParams.get('minAmount') || ''
    const maxAmount = searchParams.get('maxAmount') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const supabase = await createClient()

    // Get category ID if filtering by category
    let categoryId = null
    if (category && category !== 'all') {
      // Capitalize the first letter to match database format
      const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1)
      
      // Only log category filtering in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Filtering by category', { 
          originalCategory: category, 
          capitalizedCategory 
        })
      }
      
      const { data: categoryData, error: categoryError } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name', capitalizedCategory)
        .single()
      
      if (categoryError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching category:', categoryError)
      }
      
      if (categoryData) {
        categoryId = categoryData.id
        // Only log category ID resolution in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Category ID resolved', { categoryId })
        }
      } else {
        // Only log missing category in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('No category found', { capitalizedCategory })
        }
      }
    }

    // Start with base query - use left join to include cases without categories and aggregate approved amounts
    let query = supabase
      .from('cases')
      .select(`
        *,
        case_categories(name),
        approved_contributions:contributions!case_id(
          amount,
          approval_status:contribution_approval_status!contribution_id(status)
        )
      `, { count: 'exact' })

    // Apply status filter - default to published cases if no status specified
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.eq('status', 'published')
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    
    // Apply category filter using category_id
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    
    // Apply amount filters
    if (minAmount) {
      query = query.gte('target_amount', parseFloat(minAmount))
    }
    
    if (maxAmount) {
      query = query.lte('target_amount', parseFloat(maxAmount))
    }

    // Apply sorting
    const sortColumn = sortBy === 'amount' ? 'target_amount' : 
                      sortBy === 'priority' ? 'priority' : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching cases:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cases' },
        { status: 500 }
      )
    }

    // Only log API response details in development to avoid exposing user data and counts in production
    if (process.env.NODE_ENV === 'development') {
      logger.debug('API Response generated', { 
        totalCount: count,
        hasCategoryFilter: !!category,
        hasCategoryId: !!categoryId
      })
    }

    // Transform snake_case field names to camelCase for frontend compatibility
    const transformedCases = (data || []).map((caseItem: {
      id: string
      title: string
      description: string
      target_amount: string
      current_amount: string
      status: string
      type: string
      location?: string
      beneficiary_name?: string
      beneficiary_contact?: string
      priority: string
      created_at: string
      updated_at: string
      created_by: string
      assigned_to?: string
      sponsored_by?: string
      supporting_documents?: string
      case_categories?: { name: string } | null
      approved_contributions?: Array<{
        amount: string
        approval_status: Array<{ status: string }> | { status: string } | null
      }>
    }) => {
      // Calculate approved contributions total from the joined data
      const approvedTotal = caseItem.approved_contributions?.reduce((total, contribution) => {
        const approvalStatus = Array.isArray(contribution.approval_status) 
          ? contribution.approval_status[0]?.status 
          : contribution.approval_status?.status || 'pending'
        return approvalStatus === 'approved' ? total + parseFloat(contribution.amount) : total
      }, 0) || 0

      return {
        id: caseItem.id,
        title: caseItem.title,
        description: caseItem.description,
        targetAmount: parseFloat(caseItem.target_amount),
        currentAmount: approvedTotal, // Use approved contributions total from single query
        status: caseItem.status,
        category: caseItem.case_categories?.name || 'other', // Use category name from join
        type: caseItem.type,
        location: caseItem.location,
        beneficiaryName: caseItem.beneficiary_name,
        beneficiaryContact: caseItem.beneficiary_contact,
        priority: caseItem.priority,
        createdAt: caseItem.created_at,
        updatedAt: caseItem.updated_at,
        createdBy: caseItem.created_by,
        assignedTo: caseItem.assigned_to,
        sponsoredBy: caseItem.sponsored_by,
        supportingDocuments: caseItem.supporting_documents,
      }
    })

    return NextResponse.json({
      cases: transformedCases,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in cases API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      title,
      description,
      targetAmount,
      category,
      priority,
      location,
      beneficiaryName,
      beneficiaryContact,
      type = 'one-time',
      status = 'draft',
      duration,
      frequency,
      startDate,
      endDate
    } = body

    // Validate required fields
    if (!title || !description || !targetAmount || !category || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get category ID from category name
    let categoryId = null
    if (category) {
      const { data: categoryData } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name', category)
        .single()
      
      if (categoryData) {
        categoryId = categoryData.id
      }
    }

    // Create case
    const { data: newCase, error: insertError } = await supabase
      .from('cases')
      .insert({
        title,
        description,
        target_amount: parseFloat(targetAmount),
        category_id: categoryId,
        priority,
        location: location || null,
        beneficiary_name: beneficiaryName || null,
        beneficiary_contact: beneficiaryContact || null,
        type,
        status,
        duration: duration ? parseInt(duration) : null,
        frequency: frequency || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating case:', insertError)
      return NextResponse.json(
        { error: 'Failed to create case' },
        { status: 500 }
      )
    }

    // Create initial case update
    try {
      await caseUpdateService.createUpdate({
        caseId: newCase.id,
        title: 'Case Created',
        content: `A new case "${title}" has been created and is ready for review. Target amount: EGP ${targetAmount}.`,
        updateType: 'general',
        isPublic: false, // Internal update for case creation
        createdBy: user.id,
      })
    } catch (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating initial case update:', updateError)
      // Don't fail the request if case update creation fails
    }

    return NextResponse.json({
      case: {
        id: newCase.id,
        title: newCase.title,
        description: newCase.description,
        targetAmount: parseFloat(newCase.target_amount),
        currentAmount: parseFloat(newCase.current_amount),
        status: newCase.status,
        category,
        type: newCase.type,
        location: newCase.location,
        beneficiaryName: newCase.beneficiary_name,
        beneficiaryContact: newCase.beneficiary_contact,
        priority: newCase.priority,
        createdAt: newCase.created_at,
        updatedAt: newCase.updated_at,
        createdBy: newCase.created_by,
      }
    }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in cases API POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 