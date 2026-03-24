/**
 * Sponsorship Service
 * Handles all sponsorship-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Sponsorship {
  id: string
  sponsor_id: string
  case_id: string
  amount: string | number
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled'
  terms?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at?: string | null
  sponsor?: {
    first_name?: string | null
    last_name?: string | null
    email?: string
    company_name?: string | null
  } | null
  case?: {
    title_en?: string | null
    title_ar?: string | null
    description_en?: string | null
    description_ar?: string | null
    target_amount?: string | null
    current_amount?: string | null
    status?: string | null
  } | null
}

export interface CreateSponsorshipData {
  sponsor_id: string
  case_id: string
  amount: number
  terms?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled'
}

export interface UpdateSponsorshipData {
  amount?: number
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled'
  terms?: string | null
  start_date?: string | null
  end_date?: string | null
}

export class SponsorshipService {
  /**
   * Get all sponsorships with related data
   * @param supabase - Supabase client (server-side only)
   */
  static async getAll(supabase: SupabaseClient): Promise<Sponsorship[]> {
    const { data, error } = await supabase
      .from('sponsorships')
      .select(`
        id,
        sponsor_id,
        case_id,
        amount,
        status,
        terms,
        start_date,
        end_date,
        created_at,
        sponsor:users!sponsorships_sponsor_id_fkey(
          first_name,
          last_name,
          email
        ),
        case:cases(
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching sponsorships:', error)
      throw new Error(`Failed to fetch sponsorships: ${error.message}`)
    }

    // Transform the data to normalize nested structures
    return ((data || []) as Array<{
      sponsor?: unknown
      case?: unknown
      [key: string]: unknown
    }>).map((item) => {
      const sponsor = Array.isArray(item.sponsor) ? item.sponsor[0] : item.sponsor
      const caseData = Array.isArray(item.case) ? item.case[0] : item.case
      return {
        id: item.id as string,
        sponsor_id: item.sponsor_id as string,
        case_id: item.case_id as string,
        amount: typeof item.amount === 'string' || typeof item.amount === 'number' 
          ? parseFloat(String(item.amount)) 
          : 0,
        status: item.status as Sponsorship['status'],
        terms: (item.terms as string | null) || null,
        start_date: (item.start_date as string | null) || null,
        end_date: (item.end_date as string | null) || null,
        created_at: item.created_at as string,
        sponsor: sponsor ? {
          first_name: (sponsor as { first_name?: string | null })?.first_name || null,
          last_name: (sponsor as { last_name?: string | null })?.last_name || null,
          email: (sponsor as { email?: string })?.email || '',
          company_name: (sponsor as { company_name?: string | null })?.company_name || null
        } : null,
        case: caseData ? {
          title_en: (caseData as { title_en?: string | null })?.title_en || null,
          title_ar: (caseData as { title_ar?: string | null })?.title_ar || null,
          description_en: (caseData as { description_en?: string | null })?.description_en || null,
          description_ar: (caseData as { description_ar?: string | null })?.description_ar || null,
          target_amount: (caseData as { target_amount?: string | null })?.target_amount || null,
          current_amount: (caseData as { current_amount?: string | null })?.current_amount || null,
          status: (caseData as { status?: string | null })?.status || null
        } : null
      } as Sponsorship
    })
  }

  /**
   * Get sponsorship by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Sponsorship ID
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<Sponsorship | null> {
    const { data, error } = await supabase
      .from('sponsorships')
      .select(`
        *,
        sponsor:users!sponsorships_sponsor_id_fkey(
          first_name,
          last_name,
          email
        ),
        case:cases(
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching sponsorship:', error)
      throw new Error(`Failed to fetch sponsorship: ${error.message}`)
    }

    if (!data) {
      return null
    }

    // Transform the data
    const sponsor = Array.isArray(data.sponsor) ? data.sponsor[0] : data.sponsor
    const caseData = Array.isArray(data.case) ? data.case[0] : data.case

    return {
      id: data.id,
      sponsor_id: data.sponsor_id,
      case_id: data.case_id,
      amount: typeof data.amount === 'string' || typeof data.amount === 'number' 
        ? parseFloat(String(data.amount)) 
        : 0,
      status: data.status as Sponsorship['status'],
      terms: data.terms || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      created_at: data.created_at,
      updated_at: data.updated_at || null,
      sponsor: sponsor ? {
        first_name: sponsor.first_name || null,
        last_name: sponsor.last_name || null,
        email: sponsor.email || '',
        company_name: sponsor.company_name || null
      } : null,
      case: caseData ? {
        title_en: caseData.title_en || null,
        title_ar: caseData.title_ar || null,
        description_en: caseData.description_en || null,
        description_ar: caseData.description_ar || null,
        target_amount: caseData.target_amount || null,
        current_amount: caseData.current_amount || null,
        status: caseData.status || null
      } : null
    } as Sponsorship
  }

  /**
   * Create a new sponsorship
   * @param supabase - Supabase client (server-side only)
   * @param data - Sponsorship data
   */
  static async create(supabase: SupabaseClient, data: CreateSponsorshipData): Promise<Sponsorship> {
    const { data: newSponsorship, error } = await supabase
      .from('sponsorships')
      .insert({
        sponsor_id: data.sponsor_id,
        case_id: data.case_id,
        amount: data.amount.toString(),
        status: data.status || 'pending',
        terms: data.terms || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      })
      .select(`
        *,
        sponsor:users!sponsorships_sponsor_id_fkey(
          first_name,
          last_name,
          email
        ),
        case:cases(
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status
        )
      `)
      .single()

    if (error) {
      defaultLogger.error('Error creating sponsorship:', error)
      throw new Error(`Failed to create sponsorship: ${error.message}`)
    }

    // Transform the data
    const sponsor = Array.isArray(newSponsorship.sponsor) ? newSponsorship.sponsor[0] : newSponsorship.sponsor
    const caseData = Array.isArray(newSponsorship.case) ? newSponsorship.case[0] : newSponsorship.case

    return {
      id: newSponsorship.id,
      sponsor_id: newSponsorship.sponsor_id,
      case_id: newSponsorship.case_id,
      amount: parseFloat(String(newSponsorship.amount)),
      status: newSponsorship.status as Sponsorship['status'],
      terms: newSponsorship.terms || null,
      start_date: newSponsorship.start_date || null,
      end_date: newSponsorship.end_date || null,
      created_at: newSponsorship.created_at,
      updated_at: newSponsorship.updated_at || null,
      sponsor: sponsor ? {
        first_name: sponsor.first_name || null,
        last_name: sponsor.last_name || null,
        email: sponsor.email || '',
        company_name: sponsor.company_name || null
      } : null,
      case: caseData ? {
        title_en: caseData.title_en || null,
        title_ar: caseData.title_ar || null,
        description_en: caseData.description_en || null,
        description_ar: caseData.description_ar || null,
        target_amount: caseData.target_amount || null,
        current_amount: caseData.current_amount || null,
        status: caseData.status || null
      } : null
    } as Sponsorship
  }

  /**
   * Update a sponsorship
   * @param supabase - Supabase client (server-side only)
   * @param id - Sponsorship ID
   * @param data - Update data
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdateSponsorshipData): Promise<Sponsorship> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (data.amount !== undefined) {
      updateData.amount = data.amount.toString()
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.terms !== undefined) {
      updateData.terms = data.terms
    }
    if (data.start_date !== undefined) {
      updateData.start_date = data.start_date
    }
    if (data.end_date !== undefined) {
      updateData.end_date = data.end_date
    }

    const { data: updatedSponsorship, error } = await supabase
      .from('sponsorships')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        sponsor:users!sponsorships_sponsor_id_fkey(
          first_name,
          last_name,
          email
        ),
        case:cases(
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Sponsorship not found: ${id}`)
      }
      defaultLogger.error('Error updating sponsorship:', error)
      throw new Error(`Failed to update sponsorship: ${error.message}`)
    }

    // Transform the data
    const sponsor = Array.isArray(updatedSponsorship.sponsor) ? updatedSponsorship.sponsor[0] : updatedSponsorship.sponsor
    const caseData = Array.isArray(updatedSponsorship.case) ? updatedSponsorship.case[0] : updatedSponsorship.case

    return {
      id: updatedSponsorship.id,
      sponsor_id: updatedSponsorship.sponsor_id,
      case_id: updatedSponsorship.case_id,
      amount: parseFloat(String(updatedSponsorship.amount)),
      status: updatedSponsorship.status as Sponsorship['status'],
      terms: updatedSponsorship.terms || null,
      start_date: updatedSponsorship.start_date || null,
      end_date: updatedSponsorship.end_date || null,
      created_at: updatedSponsorship.created_at,
      updated_at: updatedSponsorship.updated_at || null,
      sponsor: sponsor ? {
        first_name: sponsor.first_name || null,
        last_name: sponsor.last_name || null,
        email: sponsor.email || '',
        company_name: sponsor.company_name || null
      } : null,
      case: caseData ? {
        title_en: caseData.title_en || null,
        title_ar: caseData.title_ar || null,
        description_en: caseData.description_en || null,
        description_ar: caseData.description_ar || null,
        target_amount: caseData.target_amount || null,
        current_amount: caseData.current_amount || null,
        status: caseData.status || null
      } : null
    } as Sponsorship
  }

  /**
   * Delete a sponsorship
   * @param supabase - Supabase client (server-side only)
   * @param id - Sponsorship ID
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('sponsorships')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting sponsorship:', error)
      throw new Error(`Failed to delete sponsorship: ${error.message}`)
    }
  }
}

