/**
 * Beneficiary Type Definitions
 * For managing beneficiary profiles across recurring cases
 */

export type BeneficiaryGender = 'male' | 'female' | 'other'
export type BeneficiaryIdType = 'national_id' | 'passport' | 'other'
export type BeneficiaryRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type DocumentType = 'identity_copy' | 'personal_photo' | 'other'

export interface Beneficiary {
  id: string
  
  // Basic Information
  name: string
  name_ar?: string
  age?: number // Calculated from year_of_birth
  year_of_birth?: number // Stored in database
  gender?: BeneficiaryGender
  
  // Contact Information
  mobile_number?: string
  additional_mobile_number?: string
  email?: string
  alternative_contact?: string
  
  // Identification
  national_id?: string
  id_type: BeneficiaryIdType
  id_type_id?: string
  
  // Location
  address?: string
  city?: string
  city_id?: string
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
  additional_mobile_number?: string
  email?: string
  alternative_contact?: string
  national_id?: string
  id_type?: BeneficiaryIdType
  id_type_id?: string
  address?: string
  city?: string
  city_id?: string
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

// Document interfaces
export interface BeneficiaryDocument {
  id: string
  beneficiary_id: string
  document_type: DocumentType
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  is_public: boolean
  description?: string
  uploaded_at: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface CreateBeneficiaryDocumentData {
  beneficiary_id: string
  document_type: DocumentType
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  is_public?: boolean
  description?: string
}

// Lookup table interfaces
export interface IdType {
  id: string
  code: string
  name_en: string
  name_ar: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface City {
  id: string
  code: string
  name_en: string
  name_ar: string
  governorate?: string
  country: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

