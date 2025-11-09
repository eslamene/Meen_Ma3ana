'use client'

/**
 * Unified Beneficiary Form Component
 * Supports both create and edit modes
 * Used in both BeneficiarySelector modal and beneficiaries/[id]/edit page
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { User, Search, CheckCircle, FileText, Image as ImageIcon, X, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { CreateBeneficiaryData, UpdateBeneficiaryData, IdType, City, DocumentType } from '@/types/beneficiary'

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
  showDocuments?: boolean // Only show documents section in create mode
}

export default function BeneficiaryForm({ 
  mode, 
  onSubmit, 
  isSubmitting, 
  defaultValues, 
  idTypes, 
  cities,
  showDocuments = mode === 'create'
}: BeneficiaryFormProps) {
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
  
  // Multiple documents state (only for create mode)
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([])
  const [currentDocumentType, setCurrentDocumentType] = useState<DocumentType>('identity_copy')
  const [currentIsPublic, setCurrentIsPublic] = useState(false)
  const [currentDescription, setCurrentDescription] = useState('')
  
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
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Create preview for images
      let previewUrl: string | undefined
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          previewUrl = e.target?.result as string
          // Add document to list
          const newDoc: PendingDocument = {
            id: Date.now().toString(),
            file,
            documentType: currentDocumentType,
            isPublic: currentIsPublic,
            description: currentDescription,
            previewUrl
          }
          setPendingDocuments(prev => [...prev, newDoc])
          // Reset form
          setCurrentDescription('')
          event.target.value = '' // Reset file input
        }
        reader.readAsDataURL(file)
      } else {
        // Add document to list for non-images
        const newDoc: PendingDocument = {
          id: Date.now().toString(),
          file,
          documentType: currentDocumentType,
          isPublic: currentIsPublic,
          description: currentDescription
        }
        setPendingDocuments(prev => [...prev, newDoc])
        // Reset form
        setCurrentDescription('')
        event.target.value = '' // Reset file input
      }
    }
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
    
    // Filter out empty strings for UUID fields (convert to undefined)
    const cleanedData: CreateBeneficiaryData & UpdateBeneficiaryData = {
      ...formData,
      id_type_id: formData.id_type_id && (typeof formData.id_type_id === 'string' ? formData.id_type_id.trim() !== '' : true) ? formData.id_type_id : undefined,
      city_id: formData.city_id && (typeof formData.city_id === 'string' ? formData.city_id.trim() !== '' : true) ? formData.city_id : undefined,
    }
    
    // Prepare documents array (only for create mode)
    const documents = showDocuments && pendingDocuments.length > 0 ? pendingDocuments.map(doc => ({
      file: doc.file,
      documentType: doc.documentType,
      isPublic: doc.isPublic,
      description: doc.description.trim() || undefined
    })) : undefined
    
    onSubmit(cleanedData, documents)
  }

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

  return (
    <form onSubmit={handleSubmit} className="w-full h-full">
      <div className={`w-full grid grid-cols-1 ${showDocuments ? 'xl:grid-cols-2' : ''} gap-4 lg:gap-6 h-full min-h-[600px]`}>
        {/* Left Side - Beneficiary Information */}
        <div className={`w-full space-y-4 lg:space-y-5 ${showDocuments ? 'xl:pr-6 xl:border-r border-b xl:border-b-0 pb-6 xl:pb-0' : ''} overflow-y-auto max-h-[calc(100vh-200px)] xl:max-h-[calc(100vh-200px)]`}>
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-2 border-b z-10">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-semibold">{t('beneficiaryInfo') || 'Beneficiary Information'}</h2>
          </div>
          
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t('basicInformation') || 'Basic Information'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className={mode === 'edit' ? 'sm:col-span-1 md:col-span-1' : 'sm:col-span-2 md:col-span-2'}>
                <Label>{t('name') || 'Name'} *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('namePlaceholder') || 'Enter full name'}
                  className="w-full"
                />
              </div>
              {mode === 'edit' && (
                <div className="sm:col-span-1 md:col-span-1">
                  <Label>{t('nameAr') || 'Name (Arabic)'}</Label>
                  <Input
                    value={formData.name_ar || ''}
                    onChange={(e) => handleChange('name_ar', e.target.value)}
                    placeholder={t('nameArPlaceholder') || 'Enter name in Arabic'}
                    className="w-full"
                  />
                </div>
              )}
              <div className={mode === 'edit' ? 'sm:col-span-1 md:col-span-1' : 'sm:col-span-1 md:col-span-1'}>
                <Label>{t('age') || 'Age'}</Label>
                <Input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                  placeholder={t('agePlaceholder') || 'Enter age'}
                  className="w-full"
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('mobileNumber') || 'Mobile Number'}</Label>
                <Input
                  type="tel"
                  value={formData.mobile_number || ''}
                  onChange={(e) => handleChange('mobile_number', e.target.value)}
                  placeholder="+20 XXX XXX XXXX"
                />
              </div>
              <div>
                <Label>{t('additionalMobileNumber') || 'Additional Mobile Number'}</Label>
                <Input
                  type="tel"
                  value={formData.additional_mobile_number || ''}
                  onChange={(e) => handleChange('additional_mobile_number', e.target.value)}
                  placeholder="+20 XXX XXX XXXX"
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t('email') || 'Email'}</Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('emailPlaceholder') || 'Enter email address'}
                  />
                </div>
                <div>
                  <Label>{t('alternativeContact') || 'Alternative Contact'}</Label>
                  <Input
                    value={formData.alternative_contact || ''}
                    onChange={(e) => handleChange('alternative_contact', e.target.value)}
                    placeholder={t('alternativeContactPlaceholder') || 'Enter alternative contact'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Identification Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t('identification') || 'Identification'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('idType') || 'ID Type'}</Label>
                <Select 
                  value={formData.id_type_id ? (typeof formData.id_type_id === 'string' ? formData.id_type_id : formData.id_type_id.toString()) : ''} 
                  onValueChange={(value) => handleChange('id_type_id', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectIdType') || 'Select ID type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {idTypes.filter(type => type.id && (typeof type.id === 'string' ? type.id.trim() !== '' : true)).map((type) => (
                      <SelectItem key={type.id} value={typeof type.id === 'string' ? type.id : type.id.toString()}>
                        {type.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{idFieldLabel}</Label>
                <Input
                  value={formData.national_id || ''}
                  onChange={(e) => handleChange('national_id', e.target.value)}
                  placeholder={idFieldPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t('location') || 'Location'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('country') || 'Country'}</Label>
                <Input
                  value={formData.country || 'Egypt'}
                  onChange={(e) => handleChange('country', e.target.value)}
                  disabled={mode === 'edit'}
                />
              </div>
              <div className="relative" ref={cityDropdownRef}>
                <Label>{t('city') || 'City'}</Label>
                <div className="relative">
                  <Input
                    value={citySearchQuery}
                    onChange={(e) => handleCitySearchChange(e.target.value)}
                    onFocus={() => setIsCityDropdownOpen(true)}
                    placeholder={t('selectCity') || 'Search and select city...'}
                    className="w-full"
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
              <div>
                <Label>{t('address') || 'Address'}</Label>
                <Textarea
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={t('addressPlaceholder') || 'Enter full address'}
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Additional Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{t('additionalInformation') || 'Additional Information'}</h3>
            {mode === 'edit' && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('medicalCondition') || 'Medical Condition'}</Label>
                <Input
                  value={formData.medical_condition || ''}
                  onChange={(e) => handleChange('medical_condition', e.target.value)}
                  placeholder={t('medicalConditionPlaceholder') || 'Brief description'}
                />
              </div>
              <div>
                <Label>{t('notes') || 'Notes'}</Label>
                {mode === 'edit' ? (
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder={t('notesPlaceholder') || 'Additional information'}
                    rows={4}
                  />
                ) : (
                  <Input
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder={t('notesPlaceholder') || 'Additional information'}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Documents (only in create mode) */}
        {showDocuments && (
          <div className="w-full space-y-4 lg:space-y-5 xl:pl-6 overflow-y-auto max-h-[calc(100vh-200px)] xl:max-h-[calc(100vh-200px)]">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-2 border-b z-10">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-semibold">{t('documents') || 'Documents'}</h2>
              {pendingDocuments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingDocuments.length}
                </Badge>
              )}
            </div>
            <div className="space-y-4 lg:space-y-5">
              <div>
                <Label className="text-base font-semibold">{t('uploadDocument') || 'Upload Document'}</Label>
                <p className="text-sm text-gray-500 mt-1">{t('uploadDocumentDescription') || 'Optional: Upload documents for this beneficiary'}</p>
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
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="mt-0"
                  />
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
          </div>
        )}
      </div>

      {/* Footer with Submit Button */}
      <div className="flex justify-end gap-2 pt-4 mt-6 border-t bg-white dark:bg-gray-900 sticky bottom-0 w-full py-4">
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px] w-full sm:w-auto">
          {isSubmitting 
            ? (mode === 'edit' ? (t('updating') || 'Updating...') : (t('creating') || 'Creating...'))
            : (mode === 'edit' ? (t('updateBeneficiary') || 'Update Beneficiary') : (t('create') || 'Create Beneficiary'))
          }
        </Button>
      </div>
    </form>
  )
}

