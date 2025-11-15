import type { BeneficiaryDocument, CreateBeneficiaryDocumentData } from '@/types/beneficiary'

import { defaultLogger } from '@/lib/logger'

export class BeneficiaryDocumentService {
  /**
   * Get documents by beneficiary ID
   */
  static async getByBeneficiaryId(beneficiaryId: string): Promise<BeneficiaryDocument[]> {
    try {
      const response = await fetch(`/api/beneficiaries/${beneficiaryId}/documents`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(`Failed to fetch documents: ${response.statusText}`)
      }

      const data = await response.json()
      return data.documents || []
    } catch (error) {
      defaultLogger.error('Error fetching beneficiary documents:', error)
      throw error instanceof Error ? error : new Error('Failed to fetch documents')
    }
  }

  /**
   * Create a new document
   */
  static async create(data: CreateBeneficiaryDocumentData): Promise<BeneficiaryDocument> {
    try {
      const response = await fetch('/api/beneficiaries/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create document: ${response.statusText}`)
      }

      const result = await response.json()
      return result.document
    } catch (error) {
      defaultLogger.error('Error creating beneficiary document:', error)
      throw error instanceof Error ? error : new Error('Failed to create document')
    }
  }

  /**
   * Update document
   */
  static async update(id: string, data: Partial<CreateBeneficiaryDocumentData>): Promise<BeneficiaryDocument> {
    try {
      const response = await fetch(`/api/beneficiaries/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update document: ${response.statusText}`)
      }

      const result = await response.json()
      return result.document
    } catch (error) {
      defaultLogger.error('Error updating beneficiary document:', error)
      throw error instanceof Error ? error : new Error('Failed to update document')
    }
  }

  /**
   * Delete document
   */
  static async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/beneficiaries/documents/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to delete document: ${response.statusText}`)
      }
    } catch (error) {
      defaultLogger.error('Error deleting beneficiary document:', error)
      throw error instanceof Error ? error : new Error('Failed to delete document')
    }
  }

  /**
   * Get document by ID
   */
  static async getById(id: string): Promise<BeneficiaryDocument | null> {
    try {
      const response = await fetch(`/api/beneficiaries/documents/${id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null // Document not found
        }
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(`Failed to fetch document: ${response.statusText}`)
      }

      const data = await response.json()
      return data.document || null
    } catch (error) {
      defaultLogger.error('Error fetching beneficiary document:', error)
      throw error instanceof Error ? error : new Error('Failed to fetch document')
    }
  }
}