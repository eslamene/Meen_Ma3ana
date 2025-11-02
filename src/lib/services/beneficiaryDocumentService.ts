import { createClient } from '@/lib/supabase/client'
import type { BeneficiaryDocument, CreateBeneficiaryDocumentData } from '@/types/beneficiary'

import { defaultLogger } from '@/lib/logger'

export class BeneficiaryDocumentService {
  /**
   * Get documents by beneficiary ID
   */
  static async getByBeneficiaryId(beneficiaryId: string): Promise<BeneficiaryDocument[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching beneficiary documents:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  /**
   * Create a new document
   */
  static async create(data: CreateBeneficiaryDocumentData): Promise<BeneficiaryDocument> {
    const supabase = createClient()

    const { data: document, error } = await supabase
      .from('beneficiary_documents')
      .insert([data])
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating beneficiary document:', error)
      throw new Error(error.message)
    }

    return document
  }

  /**
   * Update document
   */
  static async update(id: string, data: Partial<CreateBeneficiaryDocumentData>): Promise<BeneficiaryDocument> {
    const supabase = createClient()

    const { data: document, error } = await supabase
      .from('beneficiary_documents')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating beneficiary document:', error)
      throw new Error(error.message)
    }

    return document
  }

  /**
   * Delete document
   */
  static async delete(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('beneficiary_documents')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting beneficiary document:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Get document by ID
   */
  static async getById(id: string): Promise<BeneficiaryDocument | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Document not found
      }
      defaultLogger.error('Error fetching beneficiary document:', error)
      throw new Error(error.message)
    }

    return data
  }
}