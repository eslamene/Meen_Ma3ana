'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { GenericFileManager, type GenericFile, type FileCategoryConfig } from '@/components/files'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import { useAdmin } from '@/lib/admin/hooks'
import { createClient } from '@/lib/supabase/client'
import { FileText, Image as ImageIcon } from 'lucide-react'
import type { BeneficiaryDocument, DocumentType } from '@/types/beneficiary'

// Convert BeneficiaryDocument to GenericFile
function convertToGenericFile(doc: BeneficiaryDocument): GenericFile {
  return {
    id: doc.id,
    name: doc.file_name,
    originalName: doc.file_name,
    url: doc.file_url,
    size: doc.file_size || 0,
    type: doc.mime_type || 'application/octet-stream',
    category: doc.document_type,
    uploadedAt: doc.uploaded_at,
    uploadedBy: doc.uploaded_by,
    isPublic: doc.is_public,
    description: doc.description
  }
}

// Convert GenericFile back to BeneficiaryDocument format for updates
function convertFromGenericFile(file: GenericFile, beneficiaryId: string): Partial<BeneficiaryDocument> {
  return {
    file_name: file.originalName,
    document_type: file.category as DocumentType,
    is_public: file.isPublic,
    description: file.description
  }
}

// Beneficiary file categories
const BENEFICIARY_CATEGORIES: Record<string, FileCategoryConfig> = {
  identity_copy: {
    label: 'Identity Copy',
    description: 'ID cards, passports, certificates',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  },
  personal_photo: {
    label: 'Personal Photo',
    description: 'Personal photos and images',
    icon: ImageIcon,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
  },
  other: {
    label: 'Other Document',
    description: 'Other supporting documents',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  }
}

interface BeneficiaryFileManagerProps {
  beneficiaryId: string
  canEdit?: boolean
  onFilesChange?: (files: BeneficiaryDocument[]) => void
}

export default function BeneficiaryFileManager({
  beneficiaryId,
  canEdit = false,
  onFilesChange
}: BeneficiaryFileManagerProps) {
  const t = useTranslations('beneficiaries')
  const { hasRole } = useAdmin()
  const isAdmin = hasRole('admin') || hasRole('super_admin')
  const [files, setFiles] = useState<BeneficiaryDocument[]>([])
  const [loading, setLoading] = useState(true)

  // Load files
  useEffect(() => {
    loadFiles()
  }, [beneficiaryId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const documents = await BeneficiaryDocumentService.getByBeneficiaryId(beneficiaryId)
      setFiles(documents)
      onFilesChange?.(documents)
    } catch (error) {
      console.error('Error loading beneficiary documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (filesWithCategories: Array<{ file: File; category: string }>) => {
    if (!isAdmin) {
      throw new Error('Only administrators can upload beneficiary documents')
    }

    const errors: string[] = []

    for (const { file, category } of filesWithCategories) {
      try {
        // Upload via API route (handles admin checks and signed URLs)
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const fileName = `${beneficiaryId}/${category}/${fileId}-${sanitizedName}`
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', fileName)
        formData.append('bucket', 'beneficiaries')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
          const errorMessage = errorData.error || `Failed to upload ${file.name}`
          errors.push(`${file.name}: ${errorMessage}`)
          continue // Skip this file and continue with others
        }

        const uploadData = await uploadResponse.json()
        const fileUrl = uploadData.url || uploadData.signedUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL || window.location.origin}/storage/v1/object/${uploadData.bucket}/${uploadData.path}`

        // Create document record
        await BeneficiaryDocumentService.create({
          beneficiary_id: beneficiaryId,
          document_type: category as DocumentType,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          is_public: false
        })
      } catch (error) {
        // Catch individual file errors and continue with other files
        const errorMessage = error instanceof Error ? error.message : `Failed to upload ${file.name}`
        errors.push(`${file.name}: ${errorMessage}`)
      }
    }

    // If there were errors, throw a combined error message
    if (errors.length > 0) {
      const errorMessage = errors.length === 1 
        ? errors[0] 
        : `${errors.length} file(s) failed to upload:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`
      throw new Error(errorMessage)
    }

    // Reload files only if at least one file was successfully uploaded
    await loadFiles()
  }

  const handleFileUpdate = async (file: GenericFile) => {
    if (!isAdmin) {
      throw new Error('Only administrators can update beneficiary documents')
    }

    const updateData = convertFromGenericFile(file, beneficiaryId)
    await BeneficiaryDocumentService.update(file.id, updateData)
    
    // Reload files
    await loadFiles()
  }

  const handleFileDelete = async (fileId: string) => {
    if (!isAdmin) {
      throw new Error('Only administrators can delete beneficiary documents')
    }

    const file = files.find(f => f.id === fileId)
    if (!file) return

    // Delete from storage
    const supabase = createClient()
    const pathMatch = file.file_url.match(/beneficiaries\/(.+)$/)
    if (pathMatch) {
      await supabase.storage
        .from('beneficiaries')
        .remove([pathMatch[1]])
    }

    // Delete from database
    await BeneficiaryDocumentService.delete(fileId)
    
    // Reload files
    await loadFiles()
  }

  const genericFiles = files.map(convertToGenericFile)

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>
  }

  return (
    <GenericFileManager
      files={genericFiles}
      onFilesChange={(updatedFiles) => {
        // Convert back to BeneficiaryDocument format if needed
        const updatedDocs = updatedFiles.map(file => {
          const original = files.find(f => f.id === file.id)
          return original || convertToGenericFile({
            id: file.id,
            beneficiary_id: beneficiaryId,
            document_type: file.category as DocumentType,
            file_name: file.originalName,
            file_url: file.url,
            file_size: file.size,
            mime_type: file.type,
            is_public: file.isPublic,
            description: file.description,
            uploaded_at: file.uploadedAt,
            uploaded_by: file.uploadedBy,
            created_at: file.uploadedAt,
            updated_at: file.uploadedAt
          } as BeneficiaryDocument)
        })
        onFilesChange?.(updatedDocs as BeneficiaryDocument[])
      }}
      canEdit={canEdit && isAdmin}
      showUpload={isAdmin}
      categories={BENEFICIARY_CATEGORIES}
      onUpload={handleUpload}
      onFileUpdate={handleFileUpdate}
      onFileDelete={handleFileDelete}
      translationNamespace="beneficiaries"
      title={t('documents') || 'Documents'}
      emptyStateTitle={t('noDocuments') || 'No documents uploaded'}
      emptyStateDescription={t('uploadDocumentsHint') || 'Documents can be uploaded when editing'}
      defaultCategory="identity_copy"
      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
      maxFileSize={5 * 1024 * 1024} // 5MB (fallback)
      bucketName="beneficiaries" // Use storage rules from database
      getCategoryFromFile={(file) => file.category}
      getFileUrl={(file) => {
        // For private bucket, we might need to generate signed URLs
        // For now, return the stored URL
        return file.url
      }}
    />
  )
}

