'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, Image as ImageIcon, Eye, EyeOff, X, Check, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import { useAdmin } from '@/lib/admin/hooks'
import type { BeneficiaryDocument, DocumentType } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'

interface BeneficiaryDocumentUploadProps {
  beneficiaryId: string
  onDocumentUploaded: (document: BeneficiaryDocument) => void
  onDocumentDeleted: (documentId: string) => void
  documents: BeneficiaryDocument[]
}

export default function BeneficiaryDocumentUpload({
  beneficiaryId,
  onDocumentUploaded,
  onDocumentDeleted,
  documents
}: BeneficiaryDocumentUploadProps) {
  const t = useTranslations('beneficiaries')
  const { hasRole, loading: adminLoading } = useAdmin()
  const isAdmin = hasRole('admin') || hasRole('super_admin')
  const [isUploading, setIsUploading] = useState(false)

  // Debug logging
  useEffect(() => {
    logger.debug('BeneficiaryDocumentUpload - Admin check', {
      adminLoading,
      isAdmin,
      hasAdminRole: hasRole('admin'),
      hasSuperAdminRole: hasRole('super_admin')
    })
  }, [adminLoading, isAdmin, hasRole])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('identity_copy')
  const [isPublic, setIsPublic] = useState(false)
  const [description, setDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const documentTypes: { value: DocumentType; label: string; icon: React.ReactNode }[] = [
    { value: 'identity_copy', label: t('identityCopy'), icon: <FileText className="h-4 w-4" /> },
    { value: 'personal_photo', label: t('personalPhoto'), icon: <ImageIcon className="h-4 w-4" /> },
    { value: 'other', label: t('otherDocument'), icon: <FileText className="h-4 w-4" /> }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const handleUpload = async () => {
    logger.debug('handleUpload called', { 
      selectedFile: selectedFile?.name, 
      beneficiaryId,
      isAdmin,
      adminLoading 
    })
    
    if (!selectedFile) {
      logger.error('❌ No file selected')
      setUploadError('Please select a file to upload')
      return
    }

    if (!isAdmin) {
      logger.error('❌ User is not an admin')
      setUploadError('Only administrators can upload documents')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (selectedFile.size > maxSize) {
      setUploadError(`File size exceeds 5MB limit. Current size: ${formatFileSize(selectedFile.size)}`)
      return
    }

    // Validate file type (must match API allowed types)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    // Also check file extension as fallback since some browsers may report different MIME types
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    
    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension || '')) {
      setUploadError(`File type not allowed. Allowed types: JPG, PNG, GIF, WebP, PDF`)
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadSuccess(null)

      logger.debug('Starting upload', { beneficiaryId, fileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type })

      // Create a safe filename
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `beneficiary-documents/${beneficiaryId}/${documentType}-${Date.now()}-${safeName}`

      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('fileName', fileName)
      formData.append('bucket', 'beneficiaries')

      logger.debug('Sending upload request to /api/upload', {
        beneficiaryId,
        fileName,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      })

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      logger.debug('Upload response', { 
        status: uploadResponse.status, 
        ok: uploadResponse.ok,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      })

      if (!uploadResponse.ok) {
        let errorMessage = 'Failed to upload file'
        try {
        const errorData = await uploadResponse.json()
          errorMessage = errorData.error || errorMessage
          logger.error('Upload error response:', { error: errorData })
        } catch (e) {
          const text = await uploadResponse.text()
          logger.error('Upload error (non-JSON):', { error: text })
          errorMessage = `Upload failed with status ${uploadResponse.status}: ${text}`
        }
        throw new Error(errorMessage)
      }

      let uploadData
      try {
        const responseText = await uploadResponse.text()
        logger.debug('Upload response text', { responseText })
        uploadData = JSON.parse(responseText)
        logger.debug('Upload successful, parsed response', { uploadData })
      } catch (parseError) {
        logger.error('Failed to parse upload response:', { error: parseError })
        throw new Error('Failed to parse server response')
      }

      if (!uploadData.url && !uploadData.path) {
        logger.error('No URL or path in upload response:', { error: uploadData })
        throw new Error('Upload succeeded but no URL or path returned')
      }

      // Use the URL from response, or construct it if needed
      const fileUrl = uploadData.url || (uploadData.path ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL || window.location.origin}/storage/v1/object/${uploadData.bucket}/${uploadData.path}` : 
        null)
      
      if (!fileUrl) {
        throw new Error('No file URL available in response')
      }
      logger.debug('Using file URL', { fileUrl })

      logger.debug('Creating document record in database')
      let newDocument
      try {
      // Create document record
        newDocument = await BeneficiaryDocumentService.create({
        beneficiary_id: beneficiaryId,
        document_type: documentType,
        file_name: selectedFile.name,
          file_url: fileUrl,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        is_public: isPublic,
        description: description.trim() || undefined
      })

        logger.debug('Document created successfully', { newDocument })
      } catch (dbError) {
        logger.error('Database insert failed:', { error: dbError })
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error'
        logger.error('Full error details:', { error: dbError })
        throw new Error(`Failed to save document record: ${errorMessage}`)
      }

      // Call the callback to update parent component
      if (newDocument) {
        onDocumentUploaded(newDocument)
      } else {
        throw new Error('Document was not created')
      }

      // Show success message
      setUploadSuccess(`Document "${selectedFile.name}" uploaded successfully!`)

      // Reset form
      setSelectedFile(null)
      setDescription('')
      setPreviewUrl(null)
      setDocumentType('identity_copy')
      setIsPublic(false)
      setUploadError(null)
      
      // Reset file input
      const fileInputElement = document.getElementById('file-upload') as HTMLInputElement
      if (fileInputElement) {
        fileInputElement.value = ''
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(null)
      }, 3000)

    } catch (error) {
      logger.error('Error uploading document:', { error: error })
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document. Please try again.'
      setUploadError(errorMessage)
      setUploadSuccess(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await BeneficiaryDocumentService.delete(documentId)
      onDocumentDeleted(documentId)
    } catch (error) {
      logger.error('Error deleting document:', { error: error })
      alert('Failed to delete document. Please try again.')
    }
  }

  const handleToggleVisibility = async (documentId: string, isPublic: boolean) => {
    try {
      await BeneficiaryDocumentService.update(documentId, { is_public: isPublic })
      // Refresh documents or update local state
    } catch (error) {
      logger.error('Error updating document visibility:', { error: error })
      alert('Failed to update document visibility. Please try again.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Form - Only show for admins */}
      {!adminLoading && isAdmin && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('uploadDocument')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div>
            <Label htmlFor="file-upload">{t('documentType')}</Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="mt-1"
            />
            {selectedFile && (
              <div className="mt-2 p-2 bg-gray-50 rounded border">
                <div className="flex items-center gap-2">
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                </div>
              </div>
            )}
          </div>

          {/* Document Type */}
          <div>
            <Label>{t('documentType')}</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this document..."
              rows={2}
            />
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="is-public" className="text-sm font-medium">
                {t('isPublic')}
              </Label>
              <p className="text-xs text-gray-500">
                {isPublic ? t('publicDescription') : t('privateDescription')}
              </p>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="mt-2">
              <Label className="text-sm font-medium text-gray-600">Preview:</Label>
              <img 
                src={previewUrl} 
                alt="Document preview" 
                className="mt-1 max-w-xs rounded border"
              />
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{uploadSuccess}</p>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium">Error: {uploadError}</p>
              <p className="text-xs text-red-600 mt-1">Check the browser console for more details.</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={(e) => {
              logger.debug('Upload button clicked', { 
                selectedFile: selectedFile?.name, 
                isUploading,
                isAdmin 
              })
              e.preventDefault()
              handleUpload()
            }}
            disabled={!selectedFile || isUploading || !isAdmin}
            className="w-full"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('uploading') || 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('uploadDocument') || 'Upload Document'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Show message for non-admin users */}
      {!adminLoading && !isAdmin && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-gray-600">
              <Shield className="h-5 w-5 text-gray-400" />
              <p className="text-sm">
                {t('adminOnlyUpload') || 'Only administrators can upload beneficiary documents.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
            {t('documents')}
            {documents.length > 0 && <span>({documents.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {doc.mime_type?.startsWith('image/') ? (
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{documentTypes.find(t => t.value === doc.document_type)?.label}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size || 0)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleVisibility(doc.id, !doc.is_public)}
                      title={doc.is_public ? 'Make private' : 'Make public'}
                    >
                      {doc.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                      title="Delete document"
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium">{t('noDocuments') || 'No documents uploaded yet'}</p>
              <p className="text-xs mt-1">{t('uploadDocumentsHint') || 'Upload documents using the form above'}</p>
            </div>
          )}
          </CardContent>
        </Card>
    </div>
  )
}
