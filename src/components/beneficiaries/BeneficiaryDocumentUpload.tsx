'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, Image as ImageIcon, Eye, EyeOff, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import type { BeneficiaryDocument, DocumentType } from '@/types/beneficiary'

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
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('identity_copy')
  const [isPublic, setIsPublic] = useState(false)
  const [description, setDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    if (!selectedFile) return

    try {
      setIsUploading(true)

      // Create a safe filename
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `beneficiary-documents/${beneficiaryId}/${documentType}-${Date.now()}-${safeName}`

      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('fileName', fileName)
      formData.append('bucket', 'beneficiaries')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const uploadData = await uploadResponse.json()

      // Create document record
      const document = await BeneficiaryDocumentService.create({
        beneficiary_id: beneficiaryId,
        document_type: documentType,
        file_name: selectedFile.name,
        file_url: uploadData.url,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        is_public: isPublic,
        description: description.trim() || undefined
      })

      onDocumentUploaded(document)

      // Reset form
      setSelectedFile(null)
      setDescription('')
      setPreviewUrl(null)
      setDocumentType('identity_copy')
      setIsPublic(false)

    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Failed to upload document. Please try again.')
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
      console.error('Error deleting document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }

  const handleToggleVisibility = async (documentId: string, isPublic: boolean) => {
    try {
      await BeneficiaryDocumentService.updateVisibility(documentId, isPublic)
      // Refresh documents or update local state
    } catch (error) {
      console.error('Error updating document visibility:', error)
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
      {/* Upload Form */}
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

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('documents')} ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
