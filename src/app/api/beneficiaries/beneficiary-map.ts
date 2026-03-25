import type { Beneficiary } from '@/types/beneficiary'

/** Map a Supabase `beneficiaries` row to the public `Beneficiary` shape. */
export function mapBeneficiaryRow(row: Record<string, unknown>): Beneficiary {
  const totalRaw = row.total_amount_received
  const totalNum =
    typeof totalRaw === 'number'
      ? totalRaw
      : typeof totalRaw === 'string'
        ? Number(totalRaw)
        : 0

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    name_ar: row.name_ar != null ? String(row.name_ar) : undefined,
    age: row.age != null ? Number(row.age) : undefined,
    gender: row.gender as Beneficiary['gender'] | undefined,
    mobile_number: row.mobile_number != null ? String(row.mobile_number) : undefined,
    additional_mobile_number:
      row.additional_mobile_number != null ? String(row.additional_mobile_number) : undefined,
    email: row.email != null ? String(row.email) : undefined,
    alternative_contact:
      row.alternative_contact != null ? String(row.alternative_contact) : undefined,
    national_id: row.national_id != null ? String(row.national_id) : undefined,
    id_type: (row.id_type as Beneficiary['id_type']) ?? 'national_id',
    id_type_id: row.id_type_id != null ? String(row.id_type_id) : undefined,
    address: row.address != null ? String(row.address) : undefined,
    city: row.city != null ? String(row.city) : undefined,
    city_id: row.city_id != null ? String(row.city_id) : undefined,
    governorate: row.governorate != null ? String(row.governorate) : undefined,
    country: row.country != null ? String(row.country) : 'Egypt',
    medical_condition: row.medical_condition != null ? String(row.medical_condition) : undefined,
    social_situation: row.social_situation != null ? String(row.social_situation) : undefined,
    family_size: row.family_size != null ? Number(row.family_size) : undefined,
    dependents: row.dependents != null ? Number(row.dependents) : undefined,
    is_verified: Boolean(row.is_verified),
    verification_date: row.verification_date != null ? String(row.verification_date) : undefined,
    verification_notes:
      row.verification_notes != null ? String(row.verification_notes) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    risk_level: (row.risk_level as Beneficiary['risk_level']) ?? 'low',
    total_cases: row.total_cases != null ? Number(row.total_cases) : 0,
    active_cases: row.active_cases != null ? Number(row.active_cases) : 0,
    total_amount_received: Number.isFinite(totalNum) ? totalNum : 0,
    created_at: row.created_at != null ? String(row.created_at) : '',
    updated_at: row.updated_at != null ? String(row.updated_at) : '',
    created_by: row.created_by != null ? String(row.created_by) : undefined,
  }
}
