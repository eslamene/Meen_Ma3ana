/**
 * Category Service
 * Handles all category-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Category {
  id: string
  name: string
  name_en: string
  name_ar?: string | null
  description?: string | null
  description_en?: string | null
  description_ar?: string | null
  icon?: string | null
  color?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCategoryData {
  name?: string
  name_en: string
  name_ar?: string
  description?: string
  description_en?: string
  description_ar?: string
  icon?: string
  color?: string
  is_active?: boolean
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export class CategoryService {
  /**
   * Get all categories
   * @param supabase - Supabase client (server-side only)
   * @param includeInactive - Whether to include inactive categories
   */
  static async getAll(supabase: SupabaseClient, includeInactive: boolean = false): Promise<Category[]> {
    let query = supabase
      .from('case_categories')
      .select('id, name, name_en, name_ar, description, description_en, description_ar, icon, color, is_active, created_at, updated_at')
      .order('name_en', { ascending: true, nullsFirst: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error fetching categories:', error)
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    return (data || []) as Category[]
  }

  /**
   * Get category by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('case_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching category:', error)
      throw new Error(`Failed to fetch category: ${error.message}`)
    }

    return data as Category
  }

  /**
   * Get category by name
   * @param supabase - Supabase client (server-side only)
   */
  static async getByName(supabase: SupabaseClient, name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('case_categories')
      .select('*')
      .eq('name_en', name)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching category by name:', error)
      throw new Error(`Failed to fetch category: ${error.message}`)
    }

    return data as Category | null
  }

  /**
   * Create a new category
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreateCategoryData): Promise<Category> {
    // Validate required fields
    if (!data.name_en && !data.name) {
      throw new Error('name_en or name is required')
    }

    // Use name_en if provided, otherwise use name
    const finalNameEn = data.name_en || data.name || ''
    const finalNameAr = data.name_ar || data.name_en || data.name || ''

    // Check for duplicate name_en
    const { data: existingCategory } = await supabase
      .from('case_categories')
      .select('id')
      .eq('name_en', finalNameEn)
      .maybeSingle()

    if (existingCategory) {
      throw new Error('Category with this name already exists')
    }

    // Insert new category
    const { data: newCategory, error } = await supabase
      .from('case_categories')
      .insert({
        name: finalNameEn, // Keep name for backward compatibility
        name_en: finalNameEn,
        name_ar: finalNameAr,
        description: data.description_en || data.description || null,
        description_en: data.description_en || data.description || null,
        description_ar: data.description_ar || null,
        icon: data.icon || null,
        color: data.color || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating category:', error)
      throw new Error(`Failed to create category: ${error.message}`)
    }

    return newCategory as Category
  }

  /**
   * Update category
   * @param supabase - Supabase client (server-side only)
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdateCategoryData): Promise<Category> {
    const updateData: Record<string, unknown> = {}

    // Handle name_en and backward compatibility with name
    if (data.name_en !== undefined) {
      updateData.name_en = data.name_en
      updateData.name = data.name_en // Keep name for backward compatibility
    } else if (data.name !== undefined) {
      updateData.name = data.name
      updateData.name_en = data.name_en || data.name
    }

    if (data.name_ar !== undefined) updateData.name_ar = data.name_ar

    // Handle description_en and backward compatibility with description
    if (data.description_en !== undefined) {
      updateData.description_en = data.description_en
      updateData.description = data.description_en // Keep description for backward compatibility
    } else if (data.description !== undefined) {
      updateData.description = data.description
      updateData.description_en = data.description_en || data.description
    }

    if (data.description_ar !== undefined) updateData.description_ar = data.description_ar
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    updateData.updated_at = new Date().toISOString()

    // Check for duplicate name_en if name is being changed
    if (updateData.name_en) {
      const { data: existingCategory } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name_en', updateData.name_en as string)
        .neq('id', id)
        .maybeSingle()

      if (existingCategory) {
        throw new Error('Category with this name already exists')
      }
    }

    const { data: updatedCategory, error } = await supabase
      .from('case_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating category:', error)
      throw new Error(`Failed to update category: ${error.message}`)
    }

    return updatedCategory as Category
  }

  /**
   * Check if category is used by any cases
   * @param supabase - Supabase client (server-side only)
   */
  static async isUsedByCases(supabase: SupabaseClient, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('cases')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (error) {
      defaultLogger.error('Error checking category usage:', error)
      throw new Error(`Failed to check category usage: ${error.message}`)
    }

    return (data?.length || 0) > 0
  }

  /**
   * Delete category
   * @param supabase - Supabase client (server-side only)
   * @param checkUsage - Whether to check if category is used by cases (default: true)
   */
  static async delete(supabase: SupabaseClient, id: string, checkUsage: boolean = true): Promise<void> {
    if (checkUsage) {
      const isUsed = await this.isUsedByCases(supabase, id)
      if (isUsed) {
        throw new Error('Cannot delete category: It is being used by one or more cases. Deactivate it instead.')
      }
    }

    const { error } = await supabase
      .from('case_categories')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting category:', error)
      throw new Error(`Failed to delete category: ${error.message}`)
    }
  }
}

