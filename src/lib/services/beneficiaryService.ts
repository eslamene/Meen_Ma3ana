/**
 * Beneficiary lookups (service-role / server Supabase client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

function sanitizeIlikeFragment(value: string): string {
  return value
    .replace(/,/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

export class BeneficiaryService {
  static async findByIdentifier(
    supabase: SupabaseClient,
    mobileNumber?: string,
    nationalId?: string
  ): Promise<Record<string, unknown> | null> {
    if (!mobileNumber?.trim() && !nationalId?.trim()) {
      return null
    }

    const mobile = mobileNumber?.trim()
    const national = nationalId?.trim()

    if (mobile && national) {
      const { data: byMobile, error: e1 } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('mobile_number', mobile)
        .maybeSingle()
      if (e1 && e1.code !== 'PGRST116') {
        throw new Error(e1.message)
      }
      if (byMobile) {
        return byMobile
      }
      const { data: byNat, error: e2 } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('national_id', national)
        .maybeSingle()
      if (e2 && e2.code !== 'PGRST116') {
        throw new Error(e2.message)
      }
      return byNat
    }

    if (mobile) {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('mobile_number', mobile)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }
      return data
    }

    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('national_id', national!)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data
  }

  static async search(
    supabase: SupabaseClient,
    opts: { query: string; limit?: number }
  ): Promise<Record<string, unknown>[]> {
    const raw = opts.query.trim()
    if (!raw) {
      return []
    }

    const limit = opts.limit ?? 10
    const q = sanitizeIlikeFragment(raw)
    const pattern = `%${q}%`

    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .or(
        `name.ilike.${pattern},name_ar.ilike.${pattern},mobile_number.ilike.${pattern},national_id.ilike.${pattern},email.ilike.${pattern}`
      )
      .limit(limit)

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }
}
