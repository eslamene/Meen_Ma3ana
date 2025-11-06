'use client'

/**
 * Beneficiary Selector Component
 * Allows searching for existing beneficiaries or creating new ones
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Plus, User, Phone, IdCard, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { LookupService } from '@/lib/services/lookupService'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import BeneficiaryDocumentUpload from '@/components/beneficiaries/BeneficiaryDocumentUpload'
import type { Beneficiary, CreateBeneficiaryData, IdType, City, BeneficiaryDocument } from '@/types/beneficiary'

interface BeneficiarySelectorProps {
  selectedBeneficiary?: Beneficiary | null
  onSelect: (beneficiary: Beneficiary | null) => void
  defaultMobileNumber?: string
  defaultNationalId?: string
  defaultName?: string
  showOpenButton?: boolean
}

export default function BeneficiarySelector({
  selectedBeneficiary,
  onSelect,
  defaultMobileNumber,
  defaultNationalId,
  defaultName,
  showOpenButton = false,
}: BeneficiarySelectorProps) {
  const t = useTranslations('beneficiaries')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Beneficiary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)

  // Load documents function
  const loadDocuments = async (beneficiaryId: string) => {
    try {
      const docs = await BeneficiaryDocumentService.getByBeneficiaryId(beneficiaryId)
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  // Load lookup data on component mount
  useEffect(() => {
    const loadLookupData = async () => {
      try {
        const [idTypesData, citiesData] = await Promise.all([
          LookupService.getIdTypes(),
          LookupService.getCities()
        ])
        setIdTypes(idTypesData)
        setCities(citiesData)
      } catch (error) {
        console.error('Error loading lookup data:', error)
      } finally {
        setLoadingLookups(false)
      }
    }

    loadLookupData()
  }, [])

  // Auto-search when component mounts with default identifiers
  useEffect(() => {
    if (defaultMobileNumber || defaultNationalId) {
      handleSearchByIdentifier()
    }
  }, [defaultMobileNumber, defaultNationalId])

  // Load documents when beneficiary is selected
  useEffect(() => {
    if (selectedBeneficiary) {
      loadDocuments(selectedBeneficiary.id)
    }
  }, [selectedBeneficiary])

  const handleSearchByIdentifier = async () => {
    if (!defaultMobileNumber && !defaultNationalId) return

    setIsSearching(true)
    try {
      const beneficiary = await BeneficiaryService.findByIdentifier(
        defaultMobileNumber,
        defaultNationalId
      )
      
      if (beneficiary) {
        setSearchResults([beneficiary])
        onSelect(beneficiary)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching beneficiary:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await BeneficiaryService.search({
        query: searchQuery,
        limit: 10
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching beneficiaries:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateBeneficiary = async (data: CreateBeneficiaryData) => {
    setIsCreating(true)
    try {
      const newBeneficiary = await BeneficiaryService.create(data)
      onSelect(newBeneficiary)
      setShowCreateDialog(false)
      setSearchResults([newBeneficiary])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error creating beneficiary:', error)
      alert(errorMessage || 'Failed to create beneficiary')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Selected Beneficiary Display */}
      {selectedBeneficiary && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">{selectedBeneficiary.name}</h3>
                  {selectedBeneficiary.is_verified && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('verified') || 'Verified'}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedBeneficiary.mobile_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{selectedBeneficiary.mobile_number}</span>
                    </div>
                  )}
                  {selectedBeneficiary.national_id && (
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      <span>{selectedBeneficiary.national_id}</span>
                    </div>
                  )}
                  {selectedBeneficiary.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedBeneficiary.city}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  <span>{t('totalCases') || 'Total Cases'}: <strong>{selectedBeneficiary.total_cases}</strong></span>
                  <span>{t('activeCases') || 'Active Cases'}: <strong>{selectedBeneficiary.active_cases}</strong></span>
                </div>
              </div>
              {showOpenButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/beneficiaries/${selectedBeneficiary.id}`, '_blank')}
                >
                  <User className="h-4 w-4 mr-1" />
                  {t('openBeneficiary') || 'Open'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(null)}
              >
                {t('change') || 'Change'}
              </Button>
            </div>
          </CardContent>
        </Card>)}

        {/* Document Upload Section */}
        {selectedBeneficiary && (
          <BeneficiaryDocumentUpload
          beneficiaryId={selectedBeneficiary?.id || ''}
          onDocumentUploaded={(document) => {
            setDocuments(prev => [document, ...prev])
          }}
          onDocumentDeleted={(documentId) => {
            setDocuments(prev => prev.filter(doc => doc.id !== documentId))
          }}
          documents={documents}
        />
      )}

      {/* Search Section */}
      {!selectedBeneficiary && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={t('searchPlaceholder') || 'Search by name, mobile, or ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              {t('search') || 'Search'}
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('createNew') || 'Create New'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('createBeneficiary') || 'Create New Beneficiary'}</DialogTitle>
                  <DialogDescription>
                    {t('createDescription') || 'Create a profile for recurring cases'}
                  </DialogDescription>
                </DialogHeader>
                <CreateBeneficiaryForm
                  onSubmit={handleCreateBeneficiary}
                  isSubmitting={isCreating}
                  idTypes={idTypes}
                  cities={cities}
                  defaultValues={{
                    name: defaultName || '',
                    mobile_number: defaultMobileNumber || '',
                    national_id: defaultNationalId || ''
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>{t('searchResults') || 'Search Results'}</Label>
              <div className="space-y-2">
                {searchResults.map((beneficiary) => (
                  <Card
                    key={beneficiary.id}
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => onSelect(beneficiary)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{beneficiary.name}</h4>
                            {beneficiary.is_verified && (
                              <Badge variant="default" className="bg-green-500 h-5">
                                <CheckCircle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            {beneficiary.mobile_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{beneficiary.mobile_number}</span>
                              </div>
                            )}
                            {beneficiary.national_id && (
                              <div className="flex items-center gap-1">
                                <IdCard className="h-3 w-3" />
                                <span>{beneficiary.national_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{beneficiary.total_cases} {t('cases') || 'cases'}</div>
                          <div>{beneficiary.active_cases} {t('active') || 'active'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">{t('noResults') || 'No beneficiary found'}</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      {t('noResultsDescription') || 'Create a new beneficiary profile for recurring cases'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Create Beneficiary Form Component
interface CreateBeneficiaryFormProps {
  onSubmit: (data: CreateBeneficiaryData) => void
  isSubmitting: boolean
  defaultValues?: Partial<CreateBeneficiaryData>
  idTypes: IdType[]
  cities: City[]
}

function CreateBeneficiaryForm({ onSubmit, isSubmitting, defaultValues, idTypes, cities }: CreateBeneficiaryFormProps) {
  const t = useTranslations('beneficiaries')
  const [formData, setFormData] = useState<CreateBeneficiaryData>({
    name: defaultValues?.name || '',
    mobile_number: defaultValues?.mobile_number || '',
    additional_mobile_number: defaultValues?.additional_mobile_number || '',
    national_id: defaultValues?.national_id || '',
    country: 'Egypt',
    id_type: 'national_id',
    id_type_id: defaultValues?.id_type_id || '',
    city: defaultValues?.city || '',
    city_id: defaultValues?.city_id || '',
    risk_level: 'low'
  })
  
  // City search state
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<City[]>(cities)
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: keyof CreateBeneficiaryData, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // When ID type changes, also update the id_type field
      if (field === 'id_type_id') {
        const selectedIdType = idTypes.find(type => type.id === value)
        if (selectedIdType) {
          newData.id_type = selectedIdType.code as 'national_id' | 'passport' | 'other'
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
        city.name_ar.includes(citySearchQuery)
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
        city_id: '',
        city: ''
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('name') || 'Name'} *</Label>
          <Input
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('namePlaceholder') || 'Enter full name'}
          />
        </div>
        <div>
          <Label>{t('age') || 'Age'}</Label>
          <Input
            type="number"
            value={formData.age || ''}
            onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
            placeholder={t('agePlaceholder') || 'Enter age'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('idType') || 'ID Type'}</Label>
          <Select value={formData.id_type_id} onValueChange={(value) => handleChange('id_type_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectIdType') || 'Select ID type'} />
            </SelectTrigger>
            <SelectContent>
              {idTypes.filter(type => type.id && type.id.trim() !== '').map((type) => (
                <SelectItem key={type.id} value={type.id}>
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
        <textarea
          className="w-full min-h-[80px] px-3 py-2 rounded-md border border-gray-300"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder={t('notesPlaceholder') || 'Additional information'}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (t('creating') || 'Creating...') : (t('create') || 'Create Beneficiary')}
        </Button>
      </div>
    </form>
  )
}

