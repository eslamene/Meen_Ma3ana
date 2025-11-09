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
    
    // Filter out empty strings for UUID fields (convert to undefined/null)
    if (dataToInsert.id_type_id === '' || dataToInsert.id_type_id === null) {
      delete dataToInsert.id_type_id
    }
    if (dataToInsert.city_id === '' || dataToInsert.city_id === null) {
      delete dataToInsert.city_id
    }
    
    // Remove undefined values to avoid sending them to the database
    Object.keys(dataToInsert).forEach(key => {
      if (dataToInsert[key as keyof typeof dataToInsert] === undefined) {
        delete dataToInsert[key as keyof typeof dataToInsert]
      }
    })

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
    
    // Verify beneficiary exists first
    const existing = await this.getById(id)
    if (!existing) {
      throw new Error('Beneficiary not found')
    }
    
    // Start with a clean object - only include fields that should be updated
    const dataToUpdate: Record<string, unknown> = {}
    
    // Convert age to year of birth if age is provided
    if (data.age !== undefined && data.age !== null && data.age !== '') {
      const currentYear = new Date().getFullYear()
      dataToUpdate.year_of_birth = currentYear - Number(data.age)
    }
    
    // Only include fields that exist in the database schema and should be updatable
    // Explicitly list fields to avoid sending computed or invalid fields
    if (data.name !== undefined && data.name !== null && data.name !== '') {
      dataToUpdate.name = data.name
    }
    if (data.name_ar !== undefined && data.name_ar !== null && data.name_ar !== '') {
      dataToUpdate.name_ar = data.name_ar
    }
    if (data.gender !== undefined && data.gender !== null && data.gender !== '') {
      dataToUpdate.gender = data.gender
    }
    if (data.mobile_number !== undefined && data.mobile_number !== null && data.mobile_number !== '') {
      dataToUpdate.mobile_number = data.mobile_number
    }
    if (data.additional_mobile_number !== undefined && data.additional_mobile_number !== null && data.additional_mobile_number !== '') {
      dataToUpdate.additional_mobile_number = data.additional_mobile_number
    }
    if (data.email !== undefined && data.email !== null && data.email !== '') {
      dataToUpdate.email = data.email
    }
    if (data.alternative_contact !== undefined && data.alternative_contact !== null && data.alternative_contact !== '') {
      dataToUpdate.alternative_contact = data.alternative_contact
    }
    if (data.national_id !== undefined && data.national_id !== null && data.national_id !== '') {
      dataToUpdate.national_id = data.national_id
    }
    if (data.id_type !== undefined && data.id_type !== null && data.id_type !== '') {
      dataToUpdate.id_type = data.id_type
    }
    // Prefer city_id over city if both are provided
    if (data.city_id !== undefined && data.city_id !== null && data.city_id !== '') {
      dataToUpdate.city_id = data.city_id
    } else if (data.city !== undefined && data.city !== null && data.city !== '') {
      dataToUpdate.city = data.city
    }
    // id_type_id - only if not empty
    if (data.id_type_id !== undefined && data.id_type_id !== null && data.id_type_id !== '') {
      dataToUpdate.id_type_id = data.id_type_id
    }
    if (data.address !== undefined && data.address !== null && data.address !== '') {
      dataToUpdate.address = data.address
    }
    if (data.governorate !== undefined && data.governorate !== null && data.governorate !== '') {
      dataToUpdate.governorate = data.governorate
    }
    if (data.country !== undefined && data.country !== null && data.country !== '') {
      dataToUpdate.country = data.country
    }
    if (data.medical_condition !== undefined && data.medical_condition !== null && data.medical_condition !== '') {
      dataToUpdate.medical_condition = data.medical_condition
    }
    if (data.social_situation !== undefined && data.social_situation !== null && data.social_situation !== '') {
      dataToUpdate.social_situation = data.social_situation
    }
    if (data.family_size !== undefined && data.family_size !== null) {
      dataToUpdate.family_size = data.family_size
    }
    if (data.dependents !== undefined && data.dependents !== null) {
      dataToUpdate.dependents = data.dependents
    }
    if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
      dataToUpdate.notes = data.notes
    }
    if (data.risk_level !== undefined && data.risk_level !== null && data.risk_level !== '') {
      dataToUpdate.risk_level = data.risk_level
    }
    if (data.is_verified !== undefined && data.is_verified !== null) {
      dataToUpdate.is_verified = data.is_verified
    }
    if (data.verification_date !== undefined && data.verification_date !== null && data.verification_date !== '') {
      dataToUpdate.verification_date = data.verification_date
    }
    if (data.verification_notes !== undefined && data.verification_notes !== null && data.verification_notes !== '') {
      dataToUpdate.verification_notes = data.verification_notes
    }
    if (data.tags !== undefined && data.tags !== null && Array.isArray(data.tags) && data.tags.length > 0) {
      dataToUpdate.tags = data.tags
    }
    
    // Ensure we have at least one field to update
    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('No fields to update')
    }

    const { data: beneficiary, error } = await supabase
      .from('beneficiaries')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating beneficiary:', error, { beneficiaryId: id, updateData: dataToUpdate })
      throw new Error(error.message)
    }

    if (!beneficiary) {
      throw new Error('Beneficiary not found after update')
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

