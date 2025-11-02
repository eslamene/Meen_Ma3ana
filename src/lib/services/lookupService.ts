/**
 * Lookup Service
 * Handles lookup table operations for ID types, cities, etc.
 */

import { createClient } from '@/lib/supabase/client'
import type { IdType, City } from '@/types/beneficiary'

import { defaultLogger } from '@/lib/logger'

export class LookupService {
  /**
   * Get all active ID types
   */
  static async getIdTypes(): Promise<IdType[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('id_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching ID types:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get all active cities
   */
  static async getCities(): Promise<City[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching cities:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get cities by governorate
   */
  static async getCitiesByGovernorate(governorate: string): Promise<City[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .eq('governorate', governorate)
      .order('sort_order', { ascending: true })

    if (error) {
      defaultLogger.error('Error fetching cities by governorate:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get ID type by code
   */
  static async getIdTypeByCode(code: string): Promise<IdType | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('id_types')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching ID type by code:', error)
      throw new Error(error.message)
    }

    return data || null
  }

  /**
   * Get city by code
   */
  static async getCityByCode(code: string): Promise<City | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching city by code:', error)
      throw new Error(error.message)
    }

    return data || null
  }
}
