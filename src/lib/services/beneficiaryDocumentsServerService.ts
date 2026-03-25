/**
 * Server-side beneficiary_documents table access (API routes).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export class BeneficiaryDocumentsServerService {
  static async create(
    supabase: SupabaseClient,
    row: Record<string, unknown> & { uploaded_by: string }
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .insert([row])
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating beneficiary document:', error)
      throw new Error(`Failed to create document: ${error.message}`)
    }

    return data as Record<string, unknown>
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      defaultLogger.error('Error fetching beneficiary document:', error)
      throw new Error(`Failed to fetch document: ${error.message}`)
    }

    return data as Record<string, unknown>
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    patch: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating beneficiary document:', error)
      throw new Error(`Failed to update document: ${error.message}`)
    }

    return data as Record<string, unknown>
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('beneficiary_documents').delete().eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting beneficiary document:', error)
      throw new Error(`Failed to delete document: ${error.message}`)
    }
  }

  static async listByBeneficiaryId(
    supabase: SupabaseClient,
    beneficiaryId: string
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error listing beneficiary documents:', error)
      throw new Error(`Failed to fetch documents: ${error.message}`)
    }

    return (data || []) as Record<string, unknown>[]
  }
}
