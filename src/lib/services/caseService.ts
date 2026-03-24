/**
 * Case Service
 * Handles all case-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Case {
  id: string
  title_en: string
  title_ar?: string | null
  description_en?: string | null
  description_ar: string
  target_amount: string
  current_amount: string
  status: string
  type: string
  priority: string
  location?: string | null
  beneficiary_name?: string | null
  beneficiary_contact?: string | null
  created_at: string
  updated_at: string
  created_by: string
  assigned_to?: string | null
  sponsored_by?: string | null
  supporting_documents?: string | null
  category_id?: string | null
  case_categories?: {
    name: string
    icon?: string | null
    color?: string | null
  } | null
}

export interface CreateCaseData {
  title_en: string
  title_ar?: string
  description_en?: string
  description_ar: string
  target_amount: number
  category_id?: string | null
  priority: string
  location?: string | null
  beneficiary_name?: string | null
  beneficiary_contact?: string | null
  type?: string
  status?: string
  duration?: number | null
  frequency?: string | null
  start_date?: string | null
  end_date?: string | null
  created_by: string
}

export interface UpdateCaseData {
  title_en?: string
  title_ar?: string
  description_en?: string
  description_ar?: string
  target_amount?: number
  category_id?: string | null
  priority?: string
  location?: string | null
  beneficiary_name?: string | null
  beneficiary_contact?: string | null
  status?: string
  type?: string
  duration?: number | null
  frequency?: string | null
  start_date?: string | null
  end_date?: string | null
  assigned_to?: string | null
  sponsored_by?: string | null
}

export interface CaseSearchParams {
  search?: string
  type?: string
  status?: string
  category?: string
  detectedCategory?: string
  minAmount?: number
  maxAmount?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CaseListResponse {
  cases: Case[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  statistics?: {
    totalCases: number
    activeCases: number
    totalRaised: number
  }
}

export class CaseService {
  /**
   * Get cases with filtering and pagination
   * @param supabase - Supabase client (server-side only)
   */
  static async getCases(
    supabase: SupabaseClient,
    params: CaseSearchParams = {}
  ): Promise<CaseListResponse> {
    const {
      search = '',
      type = '',
      status = 'published',
      category = '',
      detectedCategory = '',
      minAmount,
      maxAmount,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
    } = params

    // Get category ID if filtering by assigned category
    let categoryId: string | null = null
    if (category && category !== 'all') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(category)) {
        categoryId = category
      }
    }

    // Get detected category ID if filtering by auto-detected category
    let detectedCategoryId: string | null = null
    if (detectedCategory && detectedCategory !== 'all') {
      const categoryNameMap: Record<string, string> = {
        'medical': 'Medical Support',
        'education': 'Educational Assistance',
        'housing': 'Housing & Rent',
        'appliances': 'Home Appliances',
        'emergency': 'Emergency Relief',
        'livelihood': 'Livelihood & Business',
        'community': 'Community & Social',
        'basicneeds': 'Basic Needs & Clothing',
        'food': 'Basic Needs & Clothing',
        'other': 'Other Support'
      }
      
      const categoryName = categoryNameMap[detectedCategory.toLowerCase()] || detectedCategory
      
      const { data: categoryData } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name_en', categoryName)
        .maybeSingle()
      
      if (categoryData) {
        detectedCategoryId = categoryData.id
      } else {
        // Fallback to name for backward compatibility
        const { data: dataByName } = await supabase
          .from('case_categories')
          .select('id')
          .eq('name', categoryName)
          .maybeSingle()
        
        if (dataByName) {
          detectedCategoryId = dataByName.id
        }
      }
    }

    // Build base query
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

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.eq('status', 'published')
    }

    // Apply search filter
    if (search) {
      query = query.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    // Apply category filters
    if (categoryId && detectedCategoryId) {
      if (categoryId === detectedCategoryId) {
        query = query.eq('category_id', categoryId)
      } else {
        query = query.or(`category_id.eq.${categoryId},category_id.eq.${detectedCategoryId}`)
      }
    } else if (categoryId) {
      query = query.eq('category_id', categoryId)
    } else if (detectedCategoryId) {
      query = query.eq('category_id', detectedCategoryId)
    }

    // Apply amount filters
    if (minAmount) {
      query = query.gte('target_amount', minAmount.toString())
    }
    if (maxAmount) {
      query = query.lte('target_amount', maxAmount.toString())
    }

    // Apply sorting
    const sortColumn = sortBy === 'amount' ? 'target_amount' : 
                      sortBy === 'priority' ? 'priority' : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Get statistics from all filtered cases
    let statsQuery = supabase
      .from('cases')
      .select('id, current_amount, status', { count: 'exact', head: false })

    // Apply same filters to stats query
    if (status) {
      statsQuery = statsQuery.eq('status', status)
    } else {
      statsQuery = statsQuery.eq('status', 'published')
    }
    if (type && type !== 'all') {
      statsQuery = statsQuery.eq('type', type)
    }
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
      statsQuery = statsQuery.gte('current_amount', minAmount.toString())
    }
    if (maxAmount) {
      statsQuery = statsQuery.lte('current_amount', maxAmount.toString())
    }
    if (search) {
      statsQuery = statsQuery.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,description_en.ilike.%${search}%,description_ar.ilike.%${search}%`)
    }

    const { data: allFilteredCases, error: statsError } = await statsQuery

    if (statsError) {
      defaultLogger.error('Error fetching statistics:', statsError)
    }

    // Calculate statistics
    const totalCases = allFilteredCases?.length || 0
    const activeCases = allFilteredCases?.filter(c => c.status === 'published').length || 0
    const totalRaised = allFilteredCases?.reduce((sum, c) => sum + (parseFloat(c.current_amount || '0') || 0), 0) || 0

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      defaultLogger.error('Error fetching cases:', error)
      throw new Error(`Failed to fetch cases: ${error.message}`)
    }

    return {
      cases: (data || []) as Case[],
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
    }
  }

  /**
   * Get case by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<Case | null> {
    const { data, error } = await supabase
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
        category_id,
        case_categories(name, icon, color)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching case:', error)
      throw new Error(`Failed to fetch case: ${error.message}`)
    }

    return data as Case
  }

  /**
   * Create a new case
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreateCaseData): Promise<Case> {
    // Get category ID from category name if needed
    let categoryId = data.category_id
    if (!categoryId && data.category_id) {
      // If category_id is provided as name, look it up
      const { data: categoryData } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name', data.category_id)
        .single()
      
      if (categoryData) {
        categoryId = categoryData.id
      }
    }

    const { data: newCase, error } = await supabase
      .from('cases')
      .insert({
        title_en: data.title_en,
        title_ar: data.title_ar || null,
        description_en: data.description_en || null,
        description_ar: data.description_ar,
        target_amount: data.target_amount.toString(),
        category_id: categoryId || null,
        priority: data.priority,
        location: data.location || null,
        beneficiary_name: data.beneficiary_name || null,
        beneficiary_contact: data.beneficiary_contact || null,
        type: data.type || 'one-time',
        status: data.status || 'draft',
        duration: data.duration || null,
        frequency: data.frequency || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        created_by: data.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating case:', error)
      throw new Error(`Failed to create case: ${error.message}`)
    }

    return newCase as Case
  }

  /**
   * Update case
   * @param supabase - Supabase client (server-side only)
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdateCaseData): Promise<Case> {
    const updateData: Record<string, unknown> = {}

    if (data.title_en !== undefined) updateData.title_en = data.title_en
    if (data.title_ar !== undefined) updateData.title_ar = data.title_ar
    if (data.description_en !== undefined) updateData.description_en = data.description_en
    if (data.description_ar !== undefined) updateData.description_ar = data.description_ar
    if (data.target_amount !== undefined) updateData.target_amount = data.target_amount.toString()
    if (data.category_id !== undefined) updateData.category_id = data.category_id
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.location !== undefined) updateData.location = data.location
    if (data.beneficiary_name !== undefined) updateData.beneficiary_name = data.beneficiary_name
    if (data.beneficiary_contact !== undefined) updateData.beneficiary_contact = data.beneficiary_contact
    if (data.status !== undefined) updateData.status = data.status
    if (data.type !== undefined) updateData.type = data.type
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.start_date !== undefined) updateData.start_date = data.start_date
    if (data.end_date !== undefined) updateData.end_date = data.end_date
    if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to
    if (data.sponsored_by !== undefined) updateData.sponsored_by = data.sponsored_by

    updateData.updated_at = new Date().toISOString()

    const { data: updatedCase, error } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating case:', error)
      throw new Error(`Failed to update case: ${error.message}`)
    }

    return updatedCase as Case
  }

  /**
   * Check if case has contributions
   * @param supabase - Supabase client (server-side only)
   */
  static async hasContributions(supabase: SupabaseClient, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('contributions')
      .select('id')
      .eq('case_id', id)
      .limit(1)

    if (error) {
      defaultLogger.error('Error checking contributions:', error)
      throw new Error(`Failed to check contributions: ${error.message}`)
    }

    return (data?.length || 0) > 0
  }

  /**
   * Get case files for cleanup
   * @param supabase - Supabase client (server-side only)
   */
  static async getCaseFiles(supabase: SupabaseClient, id: string): Promise<Array<{ file_url: string; file_path: string | null }>> {
    const { data, error } = await supabase
      .from('case_files')
      .select('file_url, file_path')
      .eq('case_id', id)

    if (error) {
      defaultLogger.error('Error fetching case files:', error)
      throw new Error(`Failed to fetch case files: ${error.message}`)
    }

    return (data || []) as Array<{ file_url: string; file_path: string | null }>
  }

  /**
   * Delete case with cascaded deletion
   * @param supabase - Supabase client (server-side only)
   * @param userId - User ID for audit logging
   */
  static async deleteWithCascade(
    supabase: SupabaseClient,
    id: string,
    userId?: string
  ): Promise<void> {
    // Delete in order to respect foreign key constraints
    await supabase.from('case_updates').delete().eq('case_id', id)
    await supabase.from('case_files').delete().eq('case_id', id)
    await supabase.from('case_images_backup').delete().eq('case_id', id)
    await supabase.from('contributions').delete().eq('case_id', id)
    await supabase.from('notifications').delete().eq('case_id', id)
    await supabase.from('case_comments').delete().eq('case_id', id)
    await supabase.from('case_favorites').delete().eq('case_id', id)
    await supabase.from('case_tags').delete().eq('case_id', id)
    await supabase.from('case_categories').delete().eq('case_id', id)

    // Finally, delete the case itself
    const { error: caseDeleteError } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)

    if (caseDeleteError) {
      defaultLogger.error('Error deleting case:', caseDeleteError)
      throw new Error(`Failed to delete case: ${caseDeleteError.message}`)
    }

    // Log the deletion to audit_logs
    if (userId) {
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        table_name: 'cases',
        record_id: id,
        user_id: userId,
        details: {
          deleted_at: new Date().toISOString(),
          cascaded_deletion: true
        }
      })
    }
  }

  /**
   * Delete case
   * @param supabase - Supabase client (server-side only)
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting case:', error)
      throw new Error(`Failed to delete case: ${error.message}`)
    }
  }

  /**
   * Update case current amount
   * @param supabase - Supabase client (server-side only)
   */
  static async updateAmount(supabase: SupabaseClient, id: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('cases')
      .update({ current_amount: amount.toString() })
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error updating case amount:', error)
      throw new Error(`Failed to update case amount: ${error.message}`)
    }
  }

  /**
   * Get case statistics
   * @param supabase - Supabase client (server-side only)
   */
  static async getStats(supabase: SupabaseClient): Promise<{
    total: number
    published: number
    completed: number
    closed: number
    under_review: number
  }> {
    const { data: cases, count, error } = await supabase
      .from('cases')
      .select('id, status', { count: 'exact' })

    if (error) {
      defaultLogger.error('Error fetching case stats:', error)
      throw new Error(`Failed to fetch case stats: ${error.message}`)
    }

    const allCases = cases || []
    return {
      total: count || 0,
      published: allCases.filter(c => c.status === 'published').length,
      completed: allCases.filter(c => c.status === 'completed').length,
      closed: allCases.filter(c => c.status === 'closed').length,
      under_review: allCases.filter(c => c.status === 'draft').length
    }
  }
}

