/**
 * Beneficiary Type Definitions
 * For managing beneficiary profiles across recurring cases
 */

export type BeneficiaryGender = 'male' | 'female' | 'other'
export type BeneficiaryIdType = 'national_id' | 'passport' | 'other'
export type BeneficiaryRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Beneficiary {
  id: string
  
  // Basic Information
  name: string
  name_ar?: string
  age?: number
  gender?: BeneficiaryGender
  
  // Contact Information
  mobile_number?: string
  email?: string
  alternative_contact?: string
  
  // Identification
  national_id?: string
  id_type: BeneficiaryIdType
  
  // Location
  address?: string
  city?: string
  governorate?: string
  country: string
  
  // Medical/Social Information
  medical_condition?: string
  social_situation?: string
  family_size?: number
  dependents?: number
  
  // Status & Verification
  is_verified: boolean
  verification_date?: string
  verification_notes?: string
  
  // Metadata
  notes?: string
  tags?: string[]
  risk_level: BeneficiaryRiskLevel
  
  // Tracking
  total_cases: number
  active_cases: number
  total_amount_received: number
  
  // Timestamps
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CreateBeneficiaryData {
  name: string
  name_ar?: string
  age?: number
  gender?: BeneficiaryGender
  mobile_number?: string
  email?: string
  alternative_contact?: string
  national_id?: string
  id_type?: BeneficiaryIdType
  address?: string
  city?: string
  governorate?: string
  country?: string
  medical_condition?: string
  social_situation?: string
  family_size?: number
  dependents?: number
  notes?: string
  tags?: string[]
  risk_level?: BeneficiaryRiskLevel
}

export interface UpdateBeneficiaryData extends Partial<CreateBeneficiaryData> {
  is_verified?: boolean
  verification_date?: string
  verification_notes?: string
}

export interface BeneficiarySearchParams {
  query?: string
  mobile_number?: string
  national_id?: string
  city?: string
  tags?: string[]
  is_verified?: boolean
  risk_level?: BeneficiaryRiskLevel
  limit?: number
  offset?: number
}

export interface BeneficiaryStats {
  total_beneficiaries: number
  verified_beneficiaries: number
  active_beneficiaries: number
  total_amount_distributed: number
  by_risk_level: {
    low: number
    medium: number
    high: number
    critical: number
  }
  by_city: Record<string, number>
}

