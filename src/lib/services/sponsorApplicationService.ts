/**
 * Sponsor Application Service
 * Handles all sponsor application-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface SponsorApplication {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  website: string
  companyDescription: string
  sponsorshipTier: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  reviewNotes?: string | null
  created_at?: string
  updated_at?: string | null
}

export interface CreateSponsorApplicationData {
  userId: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  website: string
  companyDescription: string
  sponsorshipTier: string
  status?: 'pending' | 'approved' | 'rejected'
}

export class SponsorApplicationService {
  /**
   * Create a new sponsor application
   * @param supabase - Supabase client (server-side only)
   * @param data - Application data
   */
  static async create(supabase: SupabaseClient, data: CreateSponsorApplicationData): Promise<SponsorApplication> {
    const { data: application, error } = await supabase
      .from('sponsor_applications')
      .insert({
        userId: data.userId,
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        website: data.website.trim(),
        companyDescription: data.companyDescription.trim(),
        sponsorshipTier: data.sponsorshipTier,
        status: data.status || 'pending',
        submittedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating sponsor application:', error)
      throw new Error(`Failed to create sponsor application: ${error.message}`)
    }

    return application as SponsorApplication
  }

  /**
   * Get application by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Application ID
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<SponsorApplication | null> {
    const { data, error } = await supabase
      .from('sponsor_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching sponsor application:', error)
      throw new Error(`Failed to fetch sponsor application: ${error.message}`)
    }

    return data as SponsorApplication | null
  }

  /**
   * Get applications by user ID
   * @param supabase - Supabase client (server-side only)
   * @param userId - User ID
   */
  static async getByUserId(supabase: SupabaseClient, userId: string): Promise<SponsorApplication[]> {
    const { data, error } = await supabase
      .from('sponsor_applications')
      .select('*')
      .eq('userId', userId)
      .order('submittedAt', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching sponsor applications:', error)
      throw new Error(`Failed to fetch sponsor applications: ${error.message}`)
    }

    return (data || []) as SponsorApplication[]
  }

  /**
   * Get all applications (admin only)
   * @param supabase - Supabase client (server-side only)
   * @param status - Optional status filter
   */
  static async getAll(supabase: SupabaseClient, status?: string): Promise<SponsorApplication[]> {
    let query = supabase
      .from('sponsor_applications')
      .select('*')
      .order('submittedAt', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      defaultLogger.error('Error fetching sponsor applications:', error)
      throw new Error(`Failed to fetch sponsor applications: ${error.message}`)
    }

    return (data || []) as SponsorApplication[]
  }
}

