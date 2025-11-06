/**
 * Beneficiary Service
 * Handles all beneficiary-related API operations
 */

import { createClient } from '@/lib/supabase/client'
import { defaultLogger } from '@/lib/logger'  

import type {
  Beneficiary,
  CreateBeneficiaryData,
  UpdateBeneficiaryData,
  BeneficiarySearchParams,
  BeneficiaryStats
} from '@/types/beneficiary'  

export class BeneficiaryService {
  /**
   * Calculate age from year of birth
   */
  private static calculateAge(yearOfBirth: number): number {
    const currentYear = new Date().getFullYear()
    return currentYear - yearOfBirth
  }

  /**
   * Transform beneficiary data to include calculated age
   */
  private static transformBeneficiary(beneficiary: Beneficiary): Beneficiary {
    if (beneficiary.year_of_birth) {
      beneficiary.age = this.calculateAge(beneficiary.year_of_birth)
    }
    return beneficiary as Beneficiary
  }

  /**
   * Search for beneficiaries by name, mobile number, or national ID
   */
  static async search(params: BeneficiarySearchParams): Promise<Beneficiary[]> {
    const supabase = createClient()
    let query = supabase
      .from('beneficiaries')
      .select('*')
      .order('created_at', { ascending: false })

    // Search by query (name)
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,name_ar.ilike.%${params.query}%`)
    }

    // Filter by mobile number
    if (params.mobile_number) {
      query = query.eq('mobile_number', params.mobile_number)
    }

    // Filter by national ID
    if (params.national_id) {
      query = query.eq('national_id', params.national_id)
    }

    // Filter by city
    if (params.city) {
      query = query.eq('city', params.city)
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      query = query.overlaps('tags', params.tags)
    }

    // Filter by verification status
    if (params.is_verified !== undefined) {
      query = query.eq('is_verified', params.is_verified)
    }

    // Filter by risk level
    if (params.risk_level) {
      query = query.eq('risk_level', params.risk_level)
    }

    // Pagination
    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error searching beneficiaries:', error)
      throw new Error(error.message)
    }

    return (data || []).map(beneficiary => this.transformBeneficiary(beneficiary))
  }

  /**
   * Find a beneficiary by mobile number or national ID
   */
  static async findByIdentifier(
    mobileNumber?: string,
    nationalId?: string
  ): Promise<Beneficiary | null> {
    const supabase = createClient()
    
    if (!mobileNumber && !nationalId) {
      return null
    }

    let query = supabase
      .from('beneficiaries')
      .select('*')

    if (mobileNumber && nationalId) {
      // Both identifiers provided - match either
      query = query.or(`mobile_number.eq.${mobileNumber},national_id.eq.${nationalId}`)
    } else if (mobileNumber) {
      query = query.eq('mobile_number', mobileNumber)
    } else if (nationalId) {
      query = query.eq('national_id', nationalId)
    }

    const { data, error } = await query.limit(1).single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      defaultLogger.error('Error finding beneficiary:', error)
      throw new Error(error.message)
    }

    return data ? this.transformBeneficiary(data) : null
  }

  /**
   * Get beneficiary by ID
   */
  static async getById(id: string): Promise<Beneficiary | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching beneficiary:', error)
      throw new Error(error.message)
    }

    return data ? this.transformBeneficiary(data) : null
  }

  /**
   * Create a new beneficiary
   */
  static async create(data: CreateBeneficiaryData): Promise<Beneficiary> {
    const supabase = createClient()
    
    // Check if beneficiary already exists
    const existing = await this.findByIdentifier(
      data.mobile_number,
      data.national_id
    )

    if (existing) {
      throw new Error('Beneficiary with this mobile number or national ID already exists')
    }

    // Convert age to year of birth
    const dataToInsert: CreateBeneficiaryData & { year_of_birth?: number } = { ...data }
    if (data.age) {
      const currentYear = new Date().getFullYear()
      dataToInsert.year_of_birth = currentYear - data.age
      delete dataToInsert.age // Remove age from the data to insert
    }

    const { data: beneficiary, error } = await supabase
      .from('beneficiaries')
      .insert([dataToInsert])
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating beneficiary:', error)
      throw new Error(error.message)
    }

    return this.transformBeneficiary(beneficiary)
  }

  /**
   * Update beneficiary
   */
  static async update(id: string, data: UpdateBeneficiaryData): Promise<Beneficiary> {
    const supabase = createClient()
    
    // Convert age to year of birth if age is provided
    const dataToUpdate: Partial<UpdateBeneficiaryData> & { year_of_birth?: number } = { ...data }
    if (data.age) {
      const currentYear = new Date().getFullYear()
      dataToUpdate.year_of_birth = currentYear - data.age
      delete dataToUpdate.age // Remove age from the data to update
    }

    const { data: beneficiary, error } = await supabase
      .from('beneficiaries')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating beneficiary:', error)
      throw new Error(error.message)
    }

    return this.transformBeneficiary(beneficiary)
  }

  /**
   * Verify a beneficiary
   */
  static async verify(id: string, notes?: string): Promise<Beneficiary> {
    return this.update(id, {
      is_verified: true,
      verification_date: new Date().toISOString(),
      verification_notes: notes
    })
  }

  /**
   * Delete beneficiary
   */
  static async delete(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('beneficiaries')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting beneficiary:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Get beneficiary statistics
   */
  static async getStats(): Promise<BeneficiaryStats> {
    const supabase = createClient()
    
    // Get total count and other aggregations
    const { data: beneficiaries } = await supabase
      .from('beneficiaries')
      .select('is_verified, active_cases, total_amount_received, risk_level, city')

    if (!beneficiaries) {
      return {
        total_beneficiaries: 0,
        verified_beneficiaries: 0,
        active_beneficiaries: 0,
        total_amount_distributed: 0,
        by_risk_level: { low: 0, medium: 0, high: 0, critical: 0 },
        by_city: {}
      }
    }

    const stats: BeneficiaryStats = {
      total_beneficiaries: beneficiaries.length,
      verified_beneficiaries: beneficiaries.filter(b => b.is_verified).length,
      active_beneficiaries: beneficiaries.filter(b => b.active_cases > 0).length,
      total_amount_distributed: beneficiaries.reduce((sum, b) => sum + (b.total_amount_received || 0), 0),
      by_risk_level: {
        low: beneficiaries.filter(b => b.risk_level === 'low').length,
        medium: beneficiaries.filter(b => b.risk_level === 'medium').length,
        high: beneficiaries.filter(b => b.risk_level === 'high').length,
        critical: beneficiaries.filter(b => b.risk_level === 'critical').length
      },
      by_city: {}
    }

    // Count by city
    beneficiaries.forEach(b => {
      if (b.city) {
        stats.by_city[b.city] = (stats.by_city[b.city] || 0) + 1
      }
    })

    return stats
  }

  /**
   * Get cases for a beneficiary
   */
  static async getCases(beneficiaryId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching beneficiary cases:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Get all beneficiaries with pagination and filtering
   */
  static async getAll(params: {
    page?: number
    limit?: number
    search?: string
    cityId?: string
    riskLevel?: string
  } = {}): Promise<Beneficiary[]> {
    const supabase = createClient()
    const { page = 1, limit = 10, search = '', cityId = '', riskLevel = '' } = params

    let query = supabase
      .from('beneficiaries')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile_number.ilike.%${search}%,national_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply city filter
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    // Apply risk level filter
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error fetching beneficiaries:', error)
      throw new Error(error.message)
    }

    return (data || []).map(beneficiary => this.transformBeneficiary(beneficiary))
  }
}

