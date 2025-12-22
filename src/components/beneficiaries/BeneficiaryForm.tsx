'use client'

/**
 * Unified Beneficiary Form Component
 * Supports both create and edit modes
 * Used in both BeneficiarySelector modal and beneficiaries/[id]/edit page
 */

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { User, Search, CheckCircle, FileText, Image as ImageIcon, X, FolderOpen, Eye, EyeOff, Trash2, Check, Edit, Upload, IdCard, MapPin, AlertTriangle, Phone, Mail, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import { useAdmin } from '@/lib/admin/hooks'
import { GenericFileUploader, GenericFilePreviewModal, type FileCategoryConfig, type GenericFile } from '@/components/files'
import { usePrefetchStorageRules } from '@/hooks/use-prefetch-storage-rules'
import type { CreateBeneficiaryData, UpdateBeneficiaryData, IdType, City, DocumentType } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'

export interface PendingDocument {
  id: string
  file: File
  documentType: DocumentType
  isPublic: boolean
  description: string
  previewUrl?: string
}

export interface BeneficiaryFormProps {
  mode: 'create' | 'edit'
  onSubmit: (data: CreateBeneficiaryData | UpdateBeneficiaryData, documents?: Array<{ file: File; documentType: DocumentType; isPublic: boolean; description?: string }>) => void
  isSubmitting: boolean
  defaultValues?: Partial<CreateBeneficiaryData & UpdateBeneficiaryData>
  idTypes: IdType[]
  cities: City[]
  showDocuments?: boolean // Show documents section (defaults to true for create, false for edit)
  showFooter?: boolean // Whether to show the footer with submit button
  allowCreateDocuments?: boolean // Allow managing documents during create mode and return them via onSubmit
  beneficiaryId?: string // Required in edit mode for immediate document uploads
  existingDocuments?: Array<{ id: string; file_name: string; document_type: DocumentType; file_url: string; file_size?: number; mime_type?: string; is_public: boolean; description?: string; uploaded_at: string }> // Existing documents in edit mode
  onDocumentUploaded?: (document: { id: string; file_name: string; document_type: DocumentType; file_url: string; file_size?: number; mime_type?: string; is_public: boolean; description?: string; uploaded_at: string }) => void // Callback when document is uploaded in edit mode
  onDocumentDeleted?: (documentId: string) => void // Callback when document is deleted in edit mode
  onFormDataChange?: (data: Partial<CreateBeneficiaryData & UpdateBeneficiaryData>) => void // Callback when form data changes (for draft creation)
}

export interface BeneficiaryFormRef {
  submit: () => void
}

const BeneficiaryForm = forwardRef<BeneficiaryFormRef, BeneficiaryFormProps>(({ 
  mode, 
  onSubmit, 
  isSubmitting, 
  defaultValues, 
  idTypes, 
  cities,
  showDocuments = mode === 'create',
  showFooter = true,
  allowCreateDocuments = false,
  beneficiaryId,
  existingDocuments = [],
  onDocumentUploaded,
  onDocumentDeleted,
  onFormDataChange
}, ref) => {
  const t = useTranslations('beneficiaries')
  const [formData, setFormData] = useState<CreateBeneficiaryData & UpdateBeneficiaryData>({
    name: defaultValues?.name || '',
    name_ar: defaultValues?.name_ar || '',
    mobile_number: defaultValues?.mobile_number || '',
    additional_mobile_number: defaultValues?.additional_mobile_number || '',
    national_id: defaultValues?.national_id || '',
    country: defaultValues?.country || 'Egypt',
    id_type: defaultValues?.id_type || 'national_id',
    id_type_id: defaultValues?.id_type_id || undefined,
    city: defaultValues?.city || '',
    city_id: defaultValues?.city_id || undefined,
    risk_level: defaultValues?.risk_level || 'low',
    age: defaultValues?.age || undefined,
    gender: defaultValues?.gender || 'male',
    email: defaultValues?.email || '',
    alternative_contact: defaultValues?.alternative_contact || '',
    address: defaultValues?.address || '',
    medical_condition: defaultValues?.medical_condition || '',
    notes: defaultValues?.notes || ''
  })
  
  // Multiple documents state
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([])
  const [currentDocumentType, setCurrentDocumentType] = useState<DocumentType>('identity_copy')
  const [currentIsPublic, setCurrentIsPublic] = useState(false)
  const [currentDescription, setCurrentDescription] = useState('')
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  
  // Inline editing state for existing documents
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [editingDocumentData, setEditingDocumentData] = useState<{
    file_name: string
    document_type: DocumentType
    is_public: boolean
    description?: string
  } | null>(null)
  const [isSavingDocument, setIsSavingDocument] = useState(false)
  
  // Generic file uploader state
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0)
  
  // File preview modal state
  const [previewFile, setPreviewFile] = useState<GenericFile | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  // Admin check for document uploads
  const { hasRole, loading: adminLoading } = useAdmin()
  const isAdmin = hasRole('admin') || hasRole('super_admin')
  
  // Map document types to categories for GenericFileUploader
  const beneficiaryCategories: Record<string, FileCategoryConfig> = {
    identity_copy: {
      label: t('identityCopy') || 'Identity Copy',
      description: t('identityCopyDescription') || 'ID cards, passports, certificates',
      icon: FileText,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    },
    personal_photo: {
      label: t('personalPhoto') || 'Personal Photo',
      description: t('personalPhotoDescription') || 'Personal photos and images',
      icon: ImageIcon,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    },
    other: {
      label: t('otherDocument') || 'Other Document',
      description: t('otherDocumentDescription') || 'Other supporting documents',
      icon: FileText,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    }
  }
  
  // City search state
  const [citySearchQuery, setCitySearchQuery] = useState(defaultValues?.city || '')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<City[]>(cities)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  
  const documentTypes: { value: DocumentType; label: string; icon: React.ReactNode }[] = [
    { value: 'identity_copy', label: t('identityCopy') || 'Identity Copy', icon: <FileText className="h-4 w-4" /> },
    { value: 'personal_photo', label: t('personalPhoto') || 'Personal Photo', icon: <ImageIcon className="h-4 w-4" /> },
    { value: 'other', label: t('otherDocument') || 'Other Document', icon: <FileText className="h-4 w-4" /> }
  ]
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // In edit mode with beneficiaryId, upload immediately
    if (mode === 'edit' && beneficiaryId && isAdmin) {
      await handleImmediateUpload(file, event)
      return
    }

    // In create mode, add to pending documents
      let previewUrl: string | undefined
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          previewUrl = e.target?.result as string
          const newDoc: PendingDocument = {
            id: Date.now().toString(),
            file,
            documentType: currentDocumentType,
            isPublic: currentIsPublic,
            description: currentDescription,
            previewUrl
          }
          setPendingDocuments(prev => [...prev, newDoc])
          setCurrentDescription('')
        event.target.value = ''
        }
        reader.readAsDataURL(file)
      } else {
        const newDoc: PendingDocument = {
          id: Date.now().toString(),
          file,
          documentType: currentDocumentType,
          isPublic: currentIsPublic,
          description: currentDescription
        }
        setPendingDocuments(prev => [...prev, newDoc])
        setCurrentDescription('')
      event.target.value = ''
    }
  }

  const handleImmediateUpload = async (file: File, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!beneficiaryId) return

    setIsUploadingDocument(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      // Validate file
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error(`File size exceeds 5MB limit`)
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        throw new Error(`File type not allowed. Allowed types: JPG, PNG, GIF, WebP, PDF`)
      }

      // Create filename
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `beneficiary-documents/${beneficiaryId}/${currentDocumentType}-${Date.now()}-${safeName}`

      // Upload to Supabase Storage
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
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      const fileUrl = uploadData.url || `${process.env.NEXT_PUBLIC_SUPABASE_URL || window.location.origin}/storage/v1/object/${uploadData.bucket}/${uploadData.path}`

      // Create document record
      const newDocument = await BeneficiaryDocumentService.create({
        beneficiary_id: beneficiaryId,
        document_type: currentDocumentType,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type,
        is_public: currentIsPublic,
        description: currentDescription.trim() || undefined
      })

      // Call callback
      if (onDocumentUploaded) {
        onDocumentUploaded(newDocument)
      }

      setUploadSuccess(`Document "${file.name}" uploaded successfully!`)
      setCurrentDescription('')
      event.target.value = ''

      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      setUploadError(errorMessage)
      logger.error('Error uploading document:', { error: error })
    } finally {
      setIsUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await BeneficiaryDocumentService.delete(documentId)
      if (onDocumentDeleted) {
        onDocumentDeleted(documentId)
      }
    } catch (error) {
      logger.error('Error deleting document:', { error: error })
      alert('Failed to delete document. Please try again.')
    }
  }

  const handleToggleVisibility = async (documentId: string, isPublic: boolean) => {
    try {
      await BeneficiaryDocumentService.update(documentId, { is_public: isPublic })
      // Reload or update existing documents
      if (onDocumentUploaded) {
        // Trigger a reload by calling the callback with updated document
        const updatedDoc = existingDocuments.find(d => d.id === documentId)
        if (updatedDoc) {
          onDocumentUploaded({ ...updatedDoc, is_public: isPublic })
        }
      }
    } catch (error) {
      logger.error('Error updating document visibility:', { error: error })
      alert('Failed to update document visibility. Please try again.')
    }
  }

  const handleStartEdit = (doc: typeof existingDocuments[0]) => {
    setEditingDocumentId(doc.id)
    setEditingDocumentData({
      file_name: doc.file_name,
      document_type: doc.document_type,
      is_public: doc.is_public,
      description: doc.description || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingDocumentId(null)
    setEditingDocumentData(null)
  }

  const handleSaveDocument = async (documentId: string) => {
    if (!editingDocumentData) return

    setIsSavingDocument(true)
    try {
      await BeneficiaryDocumentService.update(documentId, {
        file_name: editingDocumentData.file_name.trim(),
        document_type: editingDocumentData.document_type,
        is_public: editingDocumentData.is_public,
        description: editingDocumentData.description?.trim() || undefined
      })

      // Reload documents
      if (onDocumentUploaded) {
        const updatedDoc = existingDocuments.find(d => d.id === documentId)
        if (updatedDoc) {
          onDocumentUploaded({
            ...updatedDoc,
            file_name: editingDocumentData.file_name.trim(),
            document_type: editingDocumentData.document_type,
            is_public: editingDocumentData.is_public,
            description: editingDocumentData.description?.trim()
          })
        }
      }

      setEditingDocumentId(null)
      setEditingDocumentData(null)
    } catch (error) {
      logger.error('Error updating document:', { error: error })
      alert('Failed to update document. Please try again.')
    } finally {
      setIsSavingDocument(false)
    }
  }

  // Handle bulk upload from GenericFileUploader
  const handleBulkUpload = async (filesWithCategories: Array<{ file: File; category: string }>) => {
    if (!beneficiaryId || !filesWithCategories.length) return

    setBulkUploading(true)
    setBulkUploadProgress(0)

    try {
      for (let i = 0; i < filesWithCategories.length; i++) {
        const { file, category } = filesWithCategories[i]
        const documentType = category as DocumentType

        // Validate file
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          logger.error(`File ${file.name} exceeds 5MB limit`)
          continue
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
          logger.error(`File type not allowed for ${file.name}`)
          continue
        }

        // Create filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `beneficiary-documents/${beneficiaryId}/${documentType}-${Date.now()}-${safeName}`

        // Upload to Supabase Storage
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
          logger.error(`Failed to upload ${file.name}:`, { error: errorData.error })
          continue
        }

        const uploadData = await uploadResponse.json()
        const fileUrl = uploadData.url || `${process.env.NEXT_PUBLIC_SUPABASE_URL || window.location.origin}/storage/v1/object/${uploadData.bucket}/${uploadData.path}`

        // Create document record
        const newDocument = await BeneficiaryDocumentService.create({
          beneficiary_id: beneficiaryId,
          document_type: documentType,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          is_public: false,
          description: undefined
        })

        // Call callback
        if (onDocumentUploaded) {
          onDocumentUploaded(newDocument)
        }

        setBulkUploadProgress(((i + 1) / filesWithCategories.length) * 100)
      }

      setShowBulkUploadDialog(false)
      setUploadSuccess(`Successfully uploaded ${filesWithCategories.length} document(s)!`)
      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      logger.error('Error in bulk upload:', { error: error })
      setUploadError('Failed to upload some documents. Please try again.')
    } finally {
      setBulkUploading(false)
      setBulkUploadProgress(0)
    }
  }

  // Handle file preview
  const handlePreviewDocument = (doc: typeof existingDocuments[0]) => {
    const genericFile: GenericFile = {
      id: doc.id,
      name: doc.file_name,
      originalName: doc.file_name,
      url: doc.file_url,
      size: doc.file_size || 0,
      type: doc.mime_type || 'application/octet-stream',
      category: doc.document_type,
      description: doc.description,
      uploadedAt: doc.uploaded_at,
      isPublic: doc.is_public
    }
    setPreviewFile(genericFile)
    setShowPreviewModal(true)
  }
  
  const handleRemoveDocument = (id: string) => {
    setPendingDocuments(prev => prev.filter(doc => doc.id !== id))
  }
  
  const handleUpdateDocument = (id: string, updates: Partial<Omit<PendingDocument, 'id' | 'file' | 'previewUrl'>>) => {
    setPendingDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ))
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name || formData.name.trim().length === 0) {
      alert(t('nameRequired') || 'Name is required')
      return
    }
    
    if (!formData.mobile_number || formData.mobile_number.trim().length === 0) {
      alert(t('mobileNumberRequired') || 'Mobile number is required')
      return
    }
    
    // Filter out empty strings for UUID fields (convert to undefined)
    const cleanedData: CreateBeneficiaryData & UpdateBeneficiaryData = {
      ...formData,
      id_type_id: formData.id_type_id && (typeof formData.id_type_id === 'string' ? formData.id_type_id.trim() !== '' : true) ? formData.id_type_id : undefined,
      city_id: formData.city_id && (typeof formData.city_id === 'string' ? formData.city_id.trim() !== '' : true) ? formData.city_id : undefined,
    }
    
    // For create flows that allow documents, return pending documents to parent
    const documentsPayload =
      mode === 'create' && allowCreateDocuments && pendingDocuments.length > 0
        ? pendingDocuments.map((doc) => ({
            file: doc.file,
            documentType: doc.documentType,
            isPublic: doc.isPublic,
            description: doc.description,
          }))
        : undefined

    onSubmit(cleanedData, documentsPayload)
  }

  // Track if this is the initial mount to avoid calling callback on first render
  const isInitialMount = useRef(true)
  
  // Notify parent component of form data changes (for draft creation)
  // Prefetch storage rules using centralized hook (when beneficiaryId is available)
  usePrefetchStorageRules(beneficiaryId ? 'beneficiaries' : null)

  // Use useEffect to avoid calling setState during render
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    if (onFormDataChange && mode === 'create') {
      onFormDataChange(formData)
    }
  }, [formData, onFormDataChange, mode])

  const handleChange = (field: keyof (CreateBeneficiaryData & UpdateBeneficiaryData), value: string | number | boolean | undefined) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // When ID type changes, also update the id_type field
      if (field === 'id_type_id') {
        const selectedIdType = idTypes.find(type => type.id === value)
        if (selectedIdType) {
          newData.id_type = selectedIdType.code as 'national_id' | 'passport' | 'other'
        } else {
          newData.id_type = 'national_id' // Default fallback
        }
      }
      
      return newData
    })
  }

  // Get dynamic label and placeholder based on ID type
  const getIDFieldInfo = () => {
    const selectedIdType = idTypes.find(type => type.id === formData.id_type_id)
    const idTypeName = selectedIdType?.name_en || 'ID'
    
    return {
      label: idTypeName,
      placeholder: `Enter ${idTypeName.toLowerCase()} number`
    }
  }

  const { label: idFieldLabel, placeholder: idFieldPlaceholder } = getIDFieldInfo()

  // Filter cities based on search query
  useEffect(() => {
    if (citySearchQuery.trim() === '') {
      setFilteredCities(cities)
    } else {
      const filtered = cities.filter(city => 
        city.name_en.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
        (city.name_ar && city.name_ar.includes(citySearchQuery))
      )
      setFilteredCities(filtered)
    }
  }, [citySearchQuery, cities])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
    }

    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCityDropdownOpen])

  // Handle city selection
  const handleCitySelect = (city: City) => {
    setFormData(prev => ({
      ...prev,
      city_id: city.id,
      city: city.name_en
    }))
    setCitySearchQuery(city.name_en)
    setIsCityDropdownOpen(false)
  }

  // Handle city search input change
  const handleCitySearchChange = (value: string) => {
    setCitySearchQuery(value)
    setIsCityDropdownOpen(true)
    
    // Clear city selection if search doesn't match selected city
    if (formData.city && !value.toLowerCase().includes(formData.city.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        city_id: undefined,
        city: ''
      }))
    }
  }

  const formRef = useRef<HTMLFormElement>(null)

  useImperativeHandle(ref, () => ({
    submit: () => {
      formRef.current?.requestSubmit()
    }
  }))

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full">
      <div className={`w-full grid grid-cols-1 ${showDocuments ? 'xl:grid-cols-2' : ''} gap-6 lg:gap-8`}>
        {/* Left Side - Beneficiary Information */}
        <div className={`w-full space-y-6 ${showDocuments ? 'xl:pr-6 xl:border-r xl:border-gray-200 border-b xl:border-b-0 pb-6 xl:pb-0' : ''}`}>
          {/* Basic Information Section */}
          <Card className="border-2 border-blue-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                {t('basicInformation') || 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-gray-500" />
                    {t('name') || 'Name'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t('namePlaceholder') || 'Enter full name'}
                    className="h-11"
                  />
                </div>
                {mode === 'edit' && (
                  <div className="space-y-2">
                    <Label htmlFor="name_ar" className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="h-4 w-4 text-gray-500" />
                      {t('nameAr') || 'Name (Arabic)'}
                    </Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar || ''}
                      onChange={(e) => handleChange('name_ar', e.target.value)}
                      placeholder={t('nameArPlaceholder') || 'Enter name in Arabic'}
                      className="h-11"
                      dir="rtl"
                    />
                  </div>
                )}
              </div>

              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-gray-500" />
                    {t('gender') || 'Gender'}
                  </Label>
                  <RadioGroup
                    value={formData.gender || 'male'}
                    onValueChange={(value) => handleChange('gender', value)}
                    className="flex flex-wrap gap-4 sm:gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="gender_male" />
                      <Label htmlFor="gender_male" className="cursor-pointer">{t('male') || 'Male'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="gender_female" />
                      <Label htmlFor="gender_female" className="cursor-pointer">{t('female') || 'Female'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="gender_other" />
                      <Label htmlFor="gender_other" className="cursor-pointer">{t('other') || 'Other'}</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="mobile_number" className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {t('mobileNumber') || 'Mobile Number'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    required
                    value={formData.mobile_number || ''}
                    onChange={(e) => handleChange('mobile_number', e.target.value)}
                    placeholder="+20 XXX XXX XXXX"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additional_mobile_number" className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {t('additionalMobileNumber') || 'Additional Mobile Number'}
                  </Label>
                  <Input
                    id="additional_mobile_number"
                    type="tel"
                    value={formData.additional_mobile_number || ''}
                    onChange={(e) => handleChange('additional_mobile_number', e.target.value)}
                    placeholder="+20 XXX XXX XXXX"
                    className="h-11"
                  />
                </div>
              </div>

              {mode === 'edit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                      <Mail className="h-4 w-4 text-gray-500" />
                      {t('email') || 'Email'}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder={t('emailPlaceholder') || 'Enter email address'}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternative_contact" className="flex items-center gap-2 text-sm font-semibold">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {t('alternativeContact') || 'Alternative Contact'}
                    </Label>
                    <Input
                      id="alternative_contact"
                      value={formData.alternative_contact || ''}
                      onChange={(e) => handleChange('alternative_contact', e.target.value)}
                      placeholder={t('alternativeContactPlaceholder') || 'Enter alternative contact'}
                      className="h-11"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identification Section */}
          <Card className="border-2 border-blue-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IdCard className="h-5 w-5 text-blue-600" />
                {t('identification') || 'Identification'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="id_type" className="flex items-center gap-2 text-sm font-semibold">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    {t('idType') || 'ID Type'}
                  </Label>
                  <Select 
                    value={formData.id_type_id ? String(formData.id_type_id) : ''} 
                    onValueChange={(value) => handleChange('id_type_id', value || undefined)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('selectIdType') || 'Select ID type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {idTypes.filter(type => type.id && (typeof type.id === 'string' ? type.id.trim() !== '' : true)).map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="national_id" className="flex items-center gap-2 text-sm font-semibold">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    {idFieldLabel}
                  </Label>
                  <Input
                    id="national_id"
                    value={formData.national_id || ''}
                    onChange={(e) => handleChange('national_id', e.target.value)}
                    placeholder={idFieldPlaceholder}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-gray-500" />
                    {t('age') || 'Age'}
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                    placeholder={t('agePlaceholder') || 'Enter age'}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card className="border-2 border-blue-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
                {t('location') || 'Location'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4 text-gray-500" />
                    {t('country') || 'Country'}
                  </Label>
                  <Input
                    id="country"
                    value={formData.country || 'Egypt'}
                    onChange={(e) => handleChange('country', e.target.value)}
                    disabled={mode === 'edit'}
                    className="h-11"
                  />
                </div>
                <div className="relative space-y-2" ref={cityDropdownRef}>
                  <Label htmlFor="city" className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {t('city') || 'City'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="city"
                      value={citySearchQuery}
                      onChange={(e) => handleCitySearchChange(e.target.value)}
                      onFocus={() => setIsCityDropdownOpen(true)}
                      placeholder={t('selectCity') || 'Search and select city...'}
                      className="h-11 w-full"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                
                {/* City Dropdown */}
                {isCityDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <div
                          key={city.id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => handleCitySelect(city)}
                        >
                          <div>
                            <div className="font-medium">{city.name_en}</div>
                            {city.name_ar && (
                              <div className="text-sm text-gray-500">{city.name_ar}</div>
                            )}
                          </div>
                          {formData.city_id === city.id && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {t('noCitiesFound') || 'No cities found'}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {t('address') || 'Address'}
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={t('addressPlaceholder') || 'Enter full address'}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information Section */}
          <Card className="border-2 border-blue-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                {t('additionalInformation') || 'Additional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                    {t('riskLevel') || 'Risk Level'}
                  </Label>
                  <RadioGroup
                    value={formData.risk_level || 'low'}
                    onValueChange={(value) => handleChange('risk_level', value)}
                    className="flex flex-wrap gap-4 sm:gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="risk_low" />
                      <Label htmlFor="risk_low" className="cursor-pointer">{t('low') || 'Low'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="risk_medium" />
                      <Label htmlFor="risk_medium" className="cursor-pointer">{t('medium') || 'Medium'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="risk_high" />
                      <Label htmlFor="risk_high" className="cursor-pointer">{t('high') || 'High'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="critical" id="risk_critical" />
                      <Label htmlFor="risk_critical" className="cursor-pointer">{t('critical') || 'Critical'}</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="medical_condition" className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                    {t('medicalCondition') || 'Medical Condition'}
                  </Label>
                  <Input
                    id="medical_condition"
                    value={formData.medical_condition || ''}
                    onChange={(e) => handleChange('medical_condition', e.target.value)}
                    placeholder={t('medicalConditionPlaceholder') || 'Brief description'}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-gray-500" />
                    {t('notes') || 'Notes'}
                  </Label>
                  {mode === 'edit' ? (
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder={t('notesPlaceholder') || 'Additional information'}
                      rows={4}
                      className="resize-none"
                    />
                  ) : (
                    <Input
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder={t('notesPlaceholder') || 'Additional information'}
                      className="h-11"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Right Side - Documents */}
          {showDocuments && (mode === 'edit' || allowCreateDocuments) && (
            <div className="w-full space-y-6 lg:space-y-8 xl:pl-6">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-gray-200">
              <FolderOpen className="h-5 w-5 text-blue-600 shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('documents') || 'Documents'}</h2>
              {(pendingDocuments.length > 0 || existingDocuments.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {mode === 'edit' ? existingDocuments.length : pendingDocuments.length}
                </Badge>
              )}
            </div>
            
            {/* Upload Success/Error Messages */}
            {uploadSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{uploadSuccess}</p>
              </div>
            )}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">Error: {uploadError}</p>
              </div>
            )}
            
            {/* Upload Form - In create mode (when allowed), always show.
                In edit mode, only admins can upload. */}
            {(mode === 'create' && allowCreateDocuments) || (mode === 'edit' && !adminLoading && isAdmin === true) ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">{t('uploadDocument') || 'Upload Document'}</Label>
                <p className="text-sm text-gray-500 mt-1">{t('uploadDocumentDescription') || 'Optional: Upload documents for this beneficiary'}</p>
                </div>
                {mode === 'edit' && beneficiaryId && isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkUploadDialog(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('bulkUpload') || 'Bulk Upload'}
                  </Button>
                )}
              </div>
              
              {/* Document Type and File Input on Same Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <Label>{t('documentType') || 'Document Type'}</Label>
                  <Select value={currentDocumentType} onValueChange={(value) => setCurrentDocumentType(value as DocumentType)}>
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
                
                <div className="sm:col-span-2">
                  <Label htmlFor="file-upload">{t('uploadDocument') || 'Upload Document'}</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="mt-0"
                    disabled={isUploadingDocument || (mode === 'edit' && !isAdmin)}
                  />
                  {isUploadingDocument && (
                    <p className="text-xs text-gray-500 mt-1">{t('uploading') || 'Uploading...'}</p>
                  )}
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <div className="flex items-center space-x-2 w-full">
                    <Checkbox
                      id="current-is-public"
                      checked={currentIsPublic}
                      onCheckedChange={(checked) => setCurrentIsPublic(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="current-is-public" className="text-sm font-medium cursor-pointer">
                        {t('isPublic') || 'Public'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div>
                <Label htmlFor="current-document-description" className="text-sm">{t('description') || 'Description'} ({t('optional') || 'Optional'})</Label>
                <Input
                  id="current-document-description"
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  placeholder={t('addDescription') || 'Add a description...'}
                  className="mt-1"
                />
              </div>

              {/* Pending Documents List */}
              {pendingDocuments.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {t('documentsToUpload') || 'Documents to Upload'} ({pendingDocuments.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPendingDocuments([])
                        setCurrentDescription('')
                      }}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('clearAll') || 'Clear All'}
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {pendingDocuments.map((doc) => (
                      <Card key={doc.id} className="border-gray-200 shadow-sm">
                        <CardContent className="pt-4 space-y-3">
                          {/* Document Preview and Basic Info */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {doc.previewUrl ? (
                                <img 
                                  src={doc.previewUrl} 
                                  alt="Preview" 
                                  className="w-20 h-20 object-cover rounded border flex-shrink-0"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                  {doc.file.type.startsWith('image/') ? (
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  ) : (
                                    <FileText className="h-8 w-8 text-gray-400" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-sm truncate">{doc.file.name}</span>
                                  <span className="text-xs text-gray-500">({formatFileSize(doc.file.size)})</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Editable Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t">
                            {/* Document Type */}
                            <div className="sm:col-span-1">
                              <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                {t('documentType') || 'Document Type'}
                              </Label>
                              <Select 
                                value={doc.documentType} 
                                onValueChange={(value) => handleUpdateDocument(doc.id, { documentType: value as DocumentType })}
                              >
                                <SelectTrigger className="h-9 text-sm">
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

                            {/* Public/Private Toggle */}
                            <div className="sm:col-span-1 flex items-end">
                              <div className="flex items-center space-x-2 w-full">
                                <Checkbox
                                  id={`doc-public-${doc.id}`}
                                  checked={doc.isPublic}
                                  onCheckedChange={(checked) => handleUpdateDocument(doc.id, { isPublic: checked as boolean })}
                                />
                                <Label htmlFor={`doc-public-${doc.id}`} className="text-xs font-medium cursor-pointer">
                                  {t('isPublic') || 'Public'}
                                </Label>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="sm:col-span-2">
                              <Label htmlFor={`doc-description-${doc.id}`} className="text-xs font-medium text-gray-700 mb-1.5 block">
                                {t('description') || 'Description'} ({t('optional') || 'Optional'})
                              </Label>
                              <Input
                                id={`doc-description-${doc.id}`}
                                value={doc.description}
                                onChange={(e) => handleUpdateDocument(doc.id, { description: e.target.value })}
                                placeholder={t('addDescription') || 'Add a description...'}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('noDocumentsAdded') || 'No documents added yet'}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('selectTypeAndUpload') || 'Select document type and upload files above'}</p>
                </div>
              )}
            </div>
            ) : null}
            {/* Existing Documents List (Edit Mode only) */}
            {mode === 'edit' && existingDocuments.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  {t('existingDocuments') || 'Existing Documents'} ({existingDocuments.length})
                </Label>
                <div className="space-y-3 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {existingDocuments.map((doc) => {
                    const isEditing = editingDocumentId === doc.id
                    const editData = isEditing ? editingDocumentData : null

                    return (
                      <Card key={doc.id} className="border-gray-200 shadow-sm">
                        <CardContent className="pt-4">
                          {isEditing && editData ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                {doc.mime_type?.startsWith('image/') ? (
                                  <ImageIcon className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                                ) : (
                                  <FileText className="h-5 w-5 text-gray-500 shrink-0 mt-1" />
                                )}
                                <div className="flex-1 space-y-3">
                                  {/* Document Name */}
                                  <div>
                                    <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                      {t('documentName') || 'Document Name'}
                                    </Label>
                                    <Input
                                      value={editData.file_name}
                                      onChange={(e) => setEditingDocumentData({ ...editData, file_name: e.target.value })}
                                      className="h-9 text-sm"
                                      placeholder="Enter document name"
                                    />
            </div>

                                  {/* Document Type */}
                                  <div>
                                    <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                      {t('documentType') || 'Document Type'}
                                    </Label>
                                    <Select
                                      value={editData.document_type}
                                      onValueChange={(value) => setEditingDocumentData({ ...editData, document_type: value as DocumentType })}
                                    >
                                      <SelectTrigger className="h-9 text-sm">
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

                                  {/* Public Visibility */}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-public-${doc.id}`}
                                      checked={editData.is_public}
                                      onCheckedChange={(checked) => setEditingDocumentData({ ...editData, is_public: checked as boolean })}
                                    />
                                    <Label htmlFor={`edit-public-${doc.id}`} className="text-xs font-medium cursor-pointer">
                                      {t('isPublic') || 'Public Document'}
                                    </Label>
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                      {t('description') || 'Description'} ({t('optional') || 'Optional'})
                                    </Label>
                                    <Input
                                      value={editData.description || ''}
                                      onChange={(e) => setEditingDocumentData({ ...editData, description: e.target.value })}
                                      className="h-9 text-sm"
                                      placeholder={t('addDescription') || 'Add a description...'}
                                    />
                                  </div>

                                  {/* Metadata (read-only) */}
                                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                                    <span>{formatFileSize(doc.file_size || 0)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={isSavingDocument}
                                >
                                  {t('cancel') || 'Cancel'}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveDocument(doc.id)}
                                  disabled={isSavingDocument || !editData.file_name.trim()}
                                >
                                  {isSavingDocument ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                      {t('saving') || 'Saving...'}
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-3 w-3 mr-2" />
                                      {t('save') || 'Save'}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {doc.mime_type?.startsWith('image/') ? (
                                  <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                                ) : (
                                  <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{doc.file_name}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span>{documentTypes.find(t => t.value === doc.document_type)?.label}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.file_size || 0)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                    {doc.is_public && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                          {t('public') || 'Public'}
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEdit(doc)}
                                    title="Edit document"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
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
                                  onClick={() => handlePreviewDocument(doc)}
                                  title="View document"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    title="Delete document"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Empty state for edit mode */}
            {mode === 'edit' && existingDocuments.length === 0 && !isUploadingDocument && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('noDocuments') || 'No documents uploaded yet'}</p>
                {!isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">{t('adminOnlyUpload') || 'Only administrators can upload documents'}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Submit Button */}
      {showFooter && (
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-8 border-t border-gray-200 bg-white py-4">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="min-w-[160px] w-full sm:w-auto"
            size="lg"
          >
          {isSubmitting 
            ? (mode === 'edit' ? (t('updating') || 'Updating...') : (t('creating') || 'Creating...'))
            : (mode === 'edit' ? (t('updateBeneficiary') || 'Update Beneficiary') : (t('create') || 'Create Beneficiary'))
          }
        </Button>
      </div>
      )}

      {/* Bulk Upload Dialog */}
      {mode === 'edit' && beneficiaryId && (
        <GenericFileUploader
          open={showBulkUploadDialog}
          onOpenChange={setShowBulkUploadDialog}
          onUpload={handleBulkUpload}
          uploading={bulkUploading}
          progress={bulkUploadProgress}
          categories={beneficiaryCategories}
          defaultCategory="identity_copy"
          translationNamespace="beneficiaries"
          accept="image/*,.pdf"
          maxFileSize={5}
          bucketName="beneficiaries"
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <GenericFilePreviewModal
          file={previewFile}
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          canEdit={isAdmin}
          onFileUpdate={async (updatedFile: GenericFile) => {
            try {
              await BeneficiaryDocumentService.update(updatedFile.id, {
                file_name: updatedFile.originalName,
                document_type: updatedFile.category as DocumentType,
                is_public: updatedFile.isPublic ?? false,
                description: updatedFile.description
              })

              if (onDocumentUploaded) {
                const updatedDoc = existingDocuments.find(d => d.id === updatedFile.id)
                if (updatedDoc) {
                  onDocumentUploaded({
                    ...updatedDoc,
                    file_name: updatedFile.originalName,
                    document_type: updatedFile.category as DocumentType,
                    is_public: updatedFile.isPublic ?? false,
                    description: updatedFile.description
                  })
                }
              }
            } catch (error) {
              logger.error('Error updating document:', { error: error })
              throw error
            }
          }}
          onDelete={async (fileId: string) => {
            await handleDeleteDocument(fileId)
            setShowPreviewModal(false)
          }}
          categories={beneficiaryCategories}
          translationNamespace="beneficiaries"
          editableFields={{
            name: true,
            category: true,
            description: true,
            isPublic: true
          }}
        />
      )}
    </form>
  )
})

BeneficiaryForm.displayName = 'BeneficiaryForm'

export default BeneficiaryForm

