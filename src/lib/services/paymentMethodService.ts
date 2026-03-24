/**
 * Payment Method Service
 * Handles all payment method-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface PaymentMethod {
  id: string
  code: string
  name: string
  name_en?: string | null
  name_ar?: string | null
  description?: string | null
  description_en?: string | null
  description_ar?: string | null
  icon?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePaymentMethodData {
  code: string
  name?: string
  name_en?: string
  name_ar?: string
  description?: string
  description_en?: string
  description_ar?: string
  icon?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdatePaymentMethodData extends Partial<CreatePaymentMethodData> {}

export class PaymentMethodService {
  /**
   * Get all payment methods
   * @param supabase - Supabase client (server-side only)
   * @param includeInactive - Whether to include inactive payment methods
   */
  static async getAll(supabase: SupabaseClient, includeInactive: boolean = false): Promise<PaymentMethod[]> {
    let query = supabase
      .from('payment_methods')
      .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
      .order('sort_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error fetching payment methods:', error)
      throw new Error(`Failed to fetch payment methods: ${error.message}`)
    }

    return (data || []) as PaymentMethod[]
  }

  /**
   * Get payment method by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<PaymentMethod | null> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching payment method:', error)
      throw new Error(`Failed to fetch payment method: ${error.message}`)
    }

    return data as PaymentMethod
  }

  /**
   * Get payment method by code
   * @param supabase - Supabase client (server-side only)
   */
  static async getByCode(supabase: SupabaseClient, code: string): Promise<PaymentMethod | null> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active, created_at, updated_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching payment method by code:', error)
      throw new Error(`Failed to fetch payment method: ${error.message}`)
    }

    return data as PaymentMethod | null
  }

  /**
   * Create a new payment method
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreatePaymentMethodData): Promise<PaymentMethod> {
    // Validate required fields
    if (!data.code) {
      throw new Error('code is required')
    }

    if (!data.name_en && !data.name) {
      throw new Error('name_en or name is required')
    }

    // Check for duplicate code
    const existing = await this.getByCode(supabase, data.code)
    if (existing) {
      throw new Error('Payment method with this code already exists')
    }

    // Use name_en if provided, otherwise use name
    const finalName = data.name_en || data.name || ''
    const finalNameEn = data.name_en || data.name || ''
    const finalNameAr = data.name_ar || null

    const { data: newMethod, error } = await supabase
      .from('payment_methods')
      .insert({
        code: data.code,
        name: finalName,
        name_en: finalNameEn,
        name_ar: finalNameAr,
        description: data.description_en || data.description || null,
        description_en: data.description_en || data.description || null,
        description_ar: data.description_ar || null,
        icon: data.icon || null,
        sort_order: data.sort_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating payment method:', error)
      throw new Error(`Failed to create payment method: ${error.message}`)
    }

    return newMethod as PaymentMethod
  }

  /**
   * Update payment method
   * @param supabase - Supabase client (server-side only)
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (data.code !== undefined) updateData.code = data.code
    if (data.name !== undefined) updateData.name = data.name
    if (data.name_en !== undefined) updateData.name_en = data.name_en
    if (data.name_ar !== undefined) updateData.name_ar = data.name_ar
    if (data.description !== undefined) updateData.description = data.description
    if (data.description_en !== undefined) updateData.description_en = data.description_en
    if (data.description_ar !== undefined) updateData.description_ar = data.description_ar
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    // If code is being updated, check for duplicates
    if (data.code !== undefined) {
      const existing = await this.getByCode(supabase, data.code)
      if (existing && existing.id !== id) {
        throw new Error('Payment method with this code already exists')
      }
    }

    const { data: updatedMethod, error } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating payment method:', error)
      throw new Error(`Failed to update payment method: ${error.message}`)
    }

    return updatedMethod as PaymentMethod
  }

  /**
   * Check if payment method is in use
   * @param supabase - Supabase client (server-side only)
   */
  static async isInUse(supabase: SupabaseClient, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('contributions')
      .select('id')
      .eq('payment_method_id', id)
      .limit(1)

    if (error) {
      defaultLogger.error('Error checking payment method usage:', error)
      throw new Error(`Failed to check payment method usage: ${error.message}`)
    }

    return (data?.length || 0) > 0
  }

  /**
   * Delete payment method
   * @param supabase - Supabase client (server-side only)
   * @param checkUsage - Whether to check if payment method is in use before deleting (default: true)
   */
  static async delete(supabase: SupabaseClient, id: string, checkUsage: boolean = true): Promise<void> {
    if (checkUsage) {
      const inUse = await this.isInUse(supabase, id)
      if (inUse) {
        throw new Error('Cannot delete payment method that is in use. Deactivate it instead.')
      }
    }

    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting payment method:', error)
      throw new Error(`Failed to delete payment method: ${error.message}`)
    }
  }
}

