import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caseUpdateService } from '@/lib/case-updates'
import { env } from '@/config/env'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const detectedCategory = searchParams.get('detectedCategory') || ''
    const minAmount = searchParams.get('minAmount') || ''
    const maxAmount = searchParams.get('maxAmount') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const supabase = await createClient()

    // Get category ID if filtering by assigned category (category_id)
    let categoryId = null
    if (category && category !== 'all') {
      // Category is now a direct UUID (category_id) from caseCategories
      // Validate it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(category)) {
        categoryId = category
        if (env.NODE_ENV === 'development') {
          logger.debug('Filtering by assigned category ID', { categoryId })
        }
      } else {
        if (env.NODE_ENV === 'development') {
          logger.debug('Invalid category ID format', { category })
        }
      }
    }

    // Get detected category ID if filtering by auto-detected category (detection rules)
    let detectedCategoryId = null
    if (detectedCategory && detectedCategory !== 'all') {
      // Map detection rule filter values to actual category names in database
      const categoryNameMap: Record<string, string> = {
        'medical': 'Medical Support',
        'education': 'Educational Assistance',
        'housing': 'Housing & Rent',
        'appliances': 'Home Appliances',
        'emergency': 'Emergency Relief',
        'livelihood': 'Livelihood & Business',
        'community': 'Community & Social',
        'basicneeds': 'Basic Needs & Clothing',
        'food': 'Basic Needs & Clothing', // Map food to Basic Needs
        'other': 'Other Support'
      }
      
      // Get the actual category name from the map, or use the provided value as-is
      const categoryName = categoryNameMap[detectedCategory.toLowerCase()] || detectedCategory
      
      // Only log category filtering in development
      if (env.NODE_ENV === 'development') {
        logger.debug('Filtering by detected category', { 
          originalCategory: detectedCategory, 
          mappedCategoryName: categoryName 
        })
      }
      
      // Try to find category by name_en first, then fallback to name for backward compatibility
      let categoryData = null
      let categoryError = null
      
      // First try name_en
      const { data: dataByNameEn, error: errorByNameEn } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name_en', categoryName)
        .maybeSingle()
      
      if (dataByNameEn) {
        categoryData = dataByNameEn
      } else if (errorByNameEn) {
        categoryError = errorByNameEn
      } else {
        // If not found by name_en, try name (backward compatibility)
        const { data: dataByName, error: errorByName } = await supabase
          .from('case_categories')
          .select('id')
          .eq('name', categoryName)
          .maybeSingle()
        
        if (dataByName) {
          categoryData = dataByName
        } else if (errorByName) {
          categoryError = errorByName
        }
      }
      
      if (categoryError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching detected category:', categoryError)
      }
      
      if (categoryData) {
        detectedCategoryId = categoryData.id
        // Only log category ID resolution in development
        if (env.NODE_ENV === 'development') {
          logger.debug('Detected category ID resolved', { detectedCategoryId, categoryName })
        }
      } else {
        // Only log missing category in development
        if (env.NODE_ENV === 'development') {
          logger.debug('No detected category found', { categoryName, originalCategory: detectedCategory })
        }
      }
    }

    // Start with base query - use left join to include cases without categories
    let query = supabase
      .from('cases')
      .select(`
        id,
        title_en,
        title_ar,
        description_en,
        description_ar,
        target_amount,
        current_amount,
        status,
        type,
        priority,
        location,
        beneficiary_name,
        beneficiary_contact,
        created_at,
        updated_at,
        created_by,
        assigned_to,
        sponsored_by,
        supporting_documents,
        category_id,
        case_categories(name, icon, color)
      `, { count: 'exact' })

    // Apply status filter - default to published cases if no status specified
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.eq('status', 'published')
    }

    // Apply search filter - search in both English and Arabic fields
    if (search) {
      query = query.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }
    
    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    
    // Apply category filters
    // If both assigned and detected category filters are set, use OR logic
    if (categoryId && detectedCategoryId) {
      // If both filters point to the same category, just use one
      if (categoryId === detectedCategoryId) {
        query = query.eq('category_id', categoryId)
      } else {
        // If different categories, use OR logic (cases matching either category)
        query = query.or(`category_id.eq.${categoryId},category_id.eq.${detectedCategoryId}`)
      }
    } else if (categoryId) {
      // Apply assigned category filter using category_id
      query = query.eq('category_id', categoryId)
    } else if (detectedCategoryId) {
      // Apply detected category filter using category_id (for cases detected by rules)
      // Note: This filters cases that have been auto-detected to match the category
      // In the future, this could be enhanced to search case descriptions for keywords
      query = query.eq('category_id', detectedCategoryId)
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

    // First, get statistics from ALL filtered cases (before pagination)
    // Create a separate query for statistics with the same filters
    let statsQuery = supabase
      .from('cases')
      .select(`
        id,
        current_amount,
        status
      `, { count: 'exact', head: false })

    // Apply the same filters to stats query
    if (status) {
      statsQuery = statsQuery.eq('status', status)
    } else {
      statsQuery = statsQuery.eq('status', 'published')
    }

    if (type && type !== 'all') {
      statsQuery = statsQuery.eq('type', type)
    }

    // Apply category filters to stats query (same logic as main query)
    if (categoryId && detectedCategoryId) {
      if (categoryId === detectedCategoryId) {
        statsQuery = statsQuery.eq('category_id', categoryId)
      } else {
        statsQuery = statsQuery.or(`category_id.eq.${categoryId},category_id.eq.${detectedCategoryId}`)
      }
    } else if (categoryId) {
      statsQuery = statsQuery.eq('category_id', categoryId)
    } else if (detectedCategoryId) {
      statsQuery = statsQuery.eq('category_id', detectedCategoryId)
    }

    if (minAmount) {
      statsQuery = statsQuery.gte('current_amount', parseFloat(minAmount))
    }

    if (maxAmount) {
      statsQuery = statsQuery.lte('current_amount', parseFloat(maxAmount))
    }

    if (search) {
      statsQuery = statsQuery.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    // Get all filtered cases for statistics (no pagination)
    const { data: allFilteredCases, error: statsError } = await statsQuery

    if (statsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching statistics:', statsError)
    }

    // Calculate statistics from all filtered cases
    const totalCases = allFilteredCases?.length || 0
    const activeCases = allFilteredCases?.filter(c => c.status === 'published').length || 0
    const totalRaised = allFilteredCases?.reduce((sum, c) => sum + (parseFloat(c.current_amount || '0') || 0), 0) || 0

    // Apply pagination for the actual cases list
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching cases:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch cases', 500)
    }

    // Only log API response details in development to avoid exposing user data and counts in production
    if (env.NODE_ENV === 'development') {
      logger.debug('API Response generated', { 
        totalCount: count,
        hasCategoryFilter: !!category,
        hasCategoryId: !!categoryId
      })
    }

    // Transform snake_case field names to camelCase for frontend compatibility
    let firstCaseDebugged = false
    const transformedCases = (data || []).map((caseItem: {
      id: string
      title_en: string
      title_ar: string | null
      description_en: string | null
      description_ar: string
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
      case_categories?: { name: string; icon?: string; color?: string } | { name: string; icon?: string; color?: string }[] | null
    }) => {
      // Use current_amount from cases table (should be updated when contributions are approved)
      // Fallback to 0 if null or invalid
      const currentAmount = parseFloat(caseItem.current_amount || '0') || 0

      // Handle empty strings - preserve actual values, only convert truly empty to null
      // Schema: title_en is NOT NULL, description_ar is NOT NULL
      // But they might be empty strings if data wasn't properly populated
      const titleEn = caseItem.title_en && caseItem.title_en.trim() ? caseItem.title_en.trim() : null
      const titleAr = caseItem.title_ar && caseItem.title_ar.trim() ? caseItem.title_ar.trim() : null
      const descriptionEn = caseItem.description_en && caseItem.description_en.trim() ? caseItem.description_en.trim() : null
      const descriptionAr = caseItem.description_ar && caseItem.description_ar.trim() ? caseItem.description_ar.trim() : null

      // Debug logging for first case (in development only)
      if (env.NODE_ENV === 'development' && !firstCaseDebugged) {
        firstCaseDebugged = true
        logger.debug('Case transformation', {
          caseId: caseItem.id,
          title_en_raw: caseItem.title_en,
          title_en_type: typeof caseItem.title_en,
          title_en_length: caseItem.title_en?.length,
          titleEn_result: titleEn,
          titleAr_result: titleAr,
          descriptionEn_result: descriptionEn,
          descriptionAr_result: descriptionAr
        })
      }

      return {
        id: caseItem.id,
        title: titleEn || titleAr || '', // Default fallback (will be overridden by locale-aware fields)
        titleEn: titleEn, // Will be null only if truly empty
        titleAr: titleAr, // Will be null only if truly empty
        description: descriptionEn || descriptionAr || '', // Default fallback (will be overridden by locale-aware fields)
        descriptionEn: descriptionEn, // Will be null only if truly empty
        descriptionAr: descriptionAr, // Will be null only if truly empty
        targetAmount: parseFloat(caseItem.target_amount),
        currentAmount: currentAmount, // Use current_amount from cases table
        status: caseItem.status,
        category: (Array.isArray(caseItem.case_categories) 
          ? caseItem.case_categories[0]?.name 
          : caseItem.case_categories?.name) || 'other', // Use category name from join
        categoryData: Array.isArray(caseItem.case_categories) 
          ? caseItem.case_categories[0] 
          : caseItem.case_categories || null, // Full category object with name, icon, color
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
      },
      statistics: {
        totalCases,
        activeCases,
        totalRaised
      }
    })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      title_en,
      title_ar,
      description,
      description_en,
      description_ar,
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

    // Validate required fields - support both old and new structure
    const finalTitleEn = title_en || title || ''
    const finalTitleAr = title_ar || title || ''
    const finalDescriptionEn = description_en || description || ''
    const finalDescriptionAr = description_ar || description || ''

    if ((!finalTitleEn && !finalTitleAr) || (!finalDescriptionEn && !finalDescriptionAr) || !targetAmount || !category || !priority) {
      throw new ApiError('VALIDATION_ERROR', 'Missing required fields. Please provide at least title_en or title_ar, and description_en or description_ar.', 400)
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
        title_en: finalTitleEn,
        title_ar: finalTitleAr,
        description_en: finalDescriptionEn,
        description_ar: finalDescriptionAr,
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
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create case', 500)
    }

    // Create initial case update
    try {
      await caseUpdateService.createUpdate({
        caseId: newCase.id,
        title: 'Case Created',
        content: `A new case "${finalTitleEn || finalTitleAr}" has been created and is ready for review. Target amount: EGP ${targetAmount}.`,
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
        title: newCase.title_en || newCase.title_ar || '',
        titleEn: newCase.title_en,
        titleAr: newCase.title_ar,
        description: newCase.description_en || newCase.description_ar || '',
        descriptionEn: newCase.description_en,
        descriptionAr: newCase.description_ar,
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
}

export const GET = createGetHandler(getHandler, { loggerContext: 'api/cases' })
export const POST = createPostHandler(postHandler, { requireAuth: true, loggerContext: 'api/cases' }) 