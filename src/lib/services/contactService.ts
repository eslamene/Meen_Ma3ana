/**
 * Contact Service
 * Handles all contact form-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface ContactSubmission {
  id: string
  name: string
  email: string
  message: string
  created_at: string
}

export interface CreateContactData {
  name: string
  email: string
  message: string
}

export class ContactService {
  /**
   * Create a contact form submission
   * @param supabase - Supabase client (server-side only)
   * @param data - Contact form data
   */
  static async create(supabase: SupabaseClient, data: CreateContactData): Promise<ContactSubmission> {
    const { data: contact, error } = await supabase
      .from('landing_contacts')
      .insert({
        name: data.name,
        email: data.email,
        message: data.message,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating contact submission:', error)
      throw new Error(`Failed to create contact submission: ${error.message}`)
    }

    return contact as ContactSubmission
  }

  /**
   * Create a contact form submission (graceful - doesn't throw if table doesn't exist)
   * @param supabase - Supabase client (server-side only)
   * @param data - Contact form data
   */
  static async createGraceful(supabase: SupabaseClient, data: CreateContactData): Promise<ContactSubmission | null> {
    try {
      return await this.create(supabase, data)
    } catch (error) {
      // Log but don't throw - table may not exist
      defaultLogger.warn('Error saving contact (table may not exist):', { error })
      return null
    }
  }
}

