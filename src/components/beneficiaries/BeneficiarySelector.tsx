'use client'

/**
 * Beneficiary Selector Component
 * Allows searching for existing beneficiaries or creating new ones
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Search, Plus, User, Phone, IdCard, MapPin, CheckCircle, AlertCircle, Clock, Loader2, Sparkles, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LookupService } from '@/lib/services/lookupService'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import BeneficiaryForm, { type BeneficiaryFormRef } from '@/components/beneficiaries/BeneficiaryForm'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import { useLayout } from '@/components/layout/LayoutProvider'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Beneficiary, CreateBeneficiaryData, UpdateBeneficiaryData, IdType, City, DocumentType } from '@/types/beneficiary'

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
  const params = useParams()
  const locale = params.locale as string
  const { containerVariant } = useLayout()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Beneficiary[]>([])
  const [recentBeneficiaries, setRecentBeneficiaries] = useState<Beneficiary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const createFormRef = useRef<BeneficiaryFormRef>(null)

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

  // Load recent beneficiaries when search dialog opens
  useEffect(() => {
    const loadRecentBeneficiaries = async () => {
      if (showSearchDialog && !searchQuery && searchResults.length === 0) {
        setIsLoadingRecent(true)
        try {
          const response = await fetch('/api/beneficiaries?page=1&limit=10')
          const result = await response.json()
          if (result.success && result.data) {
            setRecentBeneficiaries(result.data)
          } else {
            setRecentBeneficiaries([])
          }
        } catch (error) {
          console.error('Error loading recent beneficiaries:', error)
          setRecentBeneficiaries([])
        } finally {
          setIsLoadingRecent(false)
        }
      } else {
        // Clear recent beneficiaries when searching
        setRecentBeneficiaries([])
      }
    }

    loadRecentBeneficiaries()
  }, [showSearchDialog, searchQuery])

  const handleSearchByIdentifier = useCallback(async () => {
    if (!defaultMobileNumber && !defaultNationalId) return

    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      if (defaultMobileNumber) params.append('mobileNumber', defaultMobileNumber)
      if (defaultNationalId) params.append('nationalId', defaultNationalId)
      
      const response = await fetch(`/api/beneficiaries/find?${params.toString()}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setSearchResults([result.data])
        onSelect(result.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching beneficiary:', error)
    } finally {
      setIsSearching(false)
    }
  }, [defaultMobileNumber, defaultNationalId, onSelect])

  // Auto-search when component mounts with default identifiers
  useEffect(() => {
    if (defaultMobileNumber || defaultNationalId) {
      handleSearchByIdentifier()
    }
  }, [defaultMobileNumber, defaultNationalId, handleSearchByIdentifier])

  const handleSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery.trim()
    
    if (!searchTerm) {
      setSearchResults([])
      setRecentBeneficiaries([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/beneficiaries/find?query=${encodeURIComponent(searchTerm)}&limit=10`)
      const result = await response.json()
      if (result.success && result.data) {
        setSearchResults(result.data)
        setRecentBeneficiaries([]) // Clear recent when searching
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching beneficiaries:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Only search if query has at least 2 characters
    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch()
      }, 300) // 300ms debounce
    } else if (searchQuery.trim().length === 0) {
      // Clear results when query is empty
      setSearchResults([])
      setIsSearching(false)
    }

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, handleSearch])

  const handleCreateBeneficiary = async (data: CreateBeneficiaryData | UpdateBeneficiaryData, documents?: Array<{ file: File; documentType: DocumentType; isPublic: boolean; description?: string }>) => {
    setIsCreating(true)
    try {
      // Cast to CreateBeneficiaryData for API call (create mode only)
      const createData = data as CreateBeneficiaryData
      
      // Use API endpoint instead of direct service call to bypass RLS
      const response = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create beneficiary'
        
        // Check if it's a duplicate beneficiary error
        if (errorMessage.includes('already exists') && (createData.mobile_number || createData.national_id)) {
          // Try to find the existing beneficiary
          try {
            const params = new URLSearchParams()
            if (createData.mobile_number) params.append('mobileNumber', createData.mobile_number)
            if (createData.national_id) params.append('nationalId', createData.national_id)
            
            const findResponse = await fetch(`/api/beneficiaries/find?${params.toString()}`)
            const findResult = await findResponse.json()
            
            if (findResult.success && findResult.data) {
              // Automatically select the existing beneficiary
              onSelect(findResult.data)
              setShowCreateDialog(false)
              setShowSearchDialog(false)
              setSearchResults([])
              setRecentBeneficiaries([])
              setSearchQuery('')
              
              // Show success toast
              toast.success('Success', {
                description: t('existingBeneficiarySelected') || 'A beneficiary with this information already exists and has been selected.',
              })
              return // Don't throw error, just return early
            }
          } catch (searchError) {
            // If we can't find the existing beneficiary, just show the error
            console.error('Error searching for existing beneficiary:', searchError)
          }
        }
        
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      const newBeneficiary = result.data
      
      // Upload documents if provided
      if (documents && documents.length > 0) {
        for (const docData of documents) {
          try {
            const safeName = docData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const fileName = `beneficiary-documents/${newBeneficiary.id}/${docData.documentType}-${Date.now()}-${safeName}`
            
            const formData = new FormData()
            formData.append('file', docData.file)
            formData.append('fileName', fileName)
            formData.append('bucket', 'beneficiaries')
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })
            
            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json()
              await BeneficiaryDocumentService.create({
                beneficiary_id: newBeneficiary.id,
                document_type: docData.documentType,
                file_name: docData.file.name,
                file_url: uploadData.url,
                file_size: docData.file.size,
                mime_type: docData.file.type,
                is_public: docData.isPublic,
                description: docData.description?.trim() || undefined
              })
            }
          } catch (docError) {
            console.error('Error uploading document:', docError)
            // Continue with other documents even if one fails
          }
        }
      }
      
      onSelect(newBeneficiary)
      setShowCreateDialog(false)
      setShowSearchDialog(false)
      setSearchResults([])
      setRecentBeneficiaries([])
      setSearchQuery('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error creating beneficiary:', error)
      
      // Show toast notification instead of alert
      toast.error('Error', {
        description: errorMessage || t('createErrorDescription') || 'An error occurred while creating the beneficiary. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectFromResults = (beneficiary: Beneficiary) => {
    onSelect(beneficiary)
    setShowSearchDialog(false)
    setSearchResults([])
    setRecentBeneficiaries([])
    setSearchQuery('')
  }

  return (
    <div className="space-y-4">
      {/* Selected Beneficiary Display */}
      {selectedBeneficiary && (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Left Section - Beneficiary Info */}
              <div className="flex-1 space-y-4">
                {/* Header with Name and Verification */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-gray-900 truncate">{selectedBeneficiary.name}</h3>
                      {selectedBeneficiary.is_verified && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('verified') || 'Verified'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-green-200">
                  {selectedBeneficiary.mobile_number && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-white/60 rounded-lg hover:bg-white/80 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">{t('mobileNumber') || 'Mobile'}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedBeneficiary.mobile_number}</p>
                      </div>
                    </div>
                  )}
                  {selectedBeneficiary.national_id && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-white/60 rounded-lg hover:bg-white/80 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
                        <IdCard className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">{t('nationalId') || 'National ID'}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedBeneficiary.national_id}</p>
                      </div>
                    </div>
                  )}
                  {selectedBeneficiary.city && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-white/60 rounded-lg hover:bg-white/80 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-orange-100 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">{t('city') || 'City'}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedBeneficiary.city}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Case Statistics */}
                <div className="flex items-center gap-4 pt-2 border-t border-green-200">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-gray-600">{t('totalCases') || 'Total Cases'}</span>
                    <span className="text-sm font-bold text-gray-900 ml-1">{selectedBeneficiary.total_cases || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">{t('activeCases') || 'Active Cases'}</span>
                    <span className="text-sm font-bold text-gray-900 ml-1">{selectedBeneficiary.active_cases || 0}</span>
                  </div>
                </div>
              </div>

              {/* Right Section - Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-end">
                {showOpenButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${locale}/beneficiaries/${selectedBeneficiary.id}`, '_blank')}
                    className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow transition-all"
                  >
                    <User className="h-4 w-4 mr-1.5" />
                    {t('openBeneficiary') || 'Open'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSearchDialog(true)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow transition-all"
                >
                  {t('change') || 'Change'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>)}

      {/* Search/Select Modal */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <User className="h-6 w-6" />
              </div>
              {t('selectBeneficiary') || 'Select Beneficiary'}
            </DialogTitle>
            <DialogDescription className="text-base mt-2 text-gray-600">
              {t('selectDescription') || 'Search for an existing beneficiary or create a new one'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="space-y-6">
              {/* Modern Search Section */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      placeholder={t('searchPlaceholder') || 'Search by name, mobile, or ID...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-12 h-12 text-base border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl shadow-sm transition-all"
                      autoFocus
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-12 px-6 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-medium rounded-xl transition-all shadow-sm"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        {t('createNew') || 'Create New'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn(
                      "max-h-[95vh] overflow-hidden p-0 flex flex-col",
                      containerVariant === 'full' ? 'max-w-[98vw] w-full' : 'max-w-[1400px] w-[95vw]'
                    )}>
                      <DialogTitle className="sr-only">
                        {t('createBeneficiary') || 'Create New Beneficiary'}
                      </DialogTitle>
                      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                        {/* Header */}
                        <EditPageHeader
                          backUrl="#"
                          icon={Plus}
                          title={t('createBeneficiary') || 'Create New Beneficiary'}
                          description={t('createDescription') || 'Create a profile for recurring cases'}
                          showBackButton={false}
                          actions={
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCreateDialog(false)}
                              className="flex items-center gap-2 hover:bg-gray-100 transition-all duration-200"
                            >
                              <X className="h-4 w-4" />
                              <span className="hidden sm:inline">Close</span>
                            </Button>
                          }
                        />

                        {/* Form Section */}
                        <div className="w-full mt-6">
                          <BeneficiaryForm
                            ref={createFormRef}
                            mode="create"
                            onSubmit={handleCreateBeneficiary}
                            isSubmitting={isCreating}
                            idTypes={idTypes}
                            cities={cities}
                            showDocuments={true}
                            showFooter={false}
                            defaultValues={{
                              name: defaultName || '',
                              mobile_number: defaultMobileNumber || '',
                              national_id: defaultNationalId || ''
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t bg-white px-4 sm:px-6 py-4">
                        <EditPageFooter
                          primaryAction={{
                            label: t('createBeneficiary') || 'Create Beneficiary',
                            onClick: () => createFormRef.current?.submit(),
                            disabled: isCreating,
                            loading: isCreating,
                            icon: <Save className="h-4 w-4 mr-2" />
                          }}
                          secondaryActions={[
                            {
                              label: t('cancel') || 'Cancel',
                              onClick: () => setShowCreateDialog(false),
                              variant: 'outline'
                            }
                          ]}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* Search hint */}
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>Type at least 2 characters to search</span>
                  </div>
                )}
              </div>

            {/* Search Results */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600 animate-pulse" />
                </div>
                <p className="text-gray-600 font-medium text-lg mt-2">{t('searching') || 'Searching...'}</p>
                <p className="text-sm text-gray-500 mt-1">Finding beneficiaries...</p>
              </div>
            )}
            
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Label className="text-base font-semibold text-gray-800">
                    {t('searchResults') || 'Search Results'}
                  </Label>
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                    {searchResults.length}
                  </Badge>
                </div>
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((beneficiary, index) => (
                    <Card
                      key={beneficiary.id}
                      className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-300 border-2 bg-white group"
                      onClick={() => handleSelectFromResults(beneficiary)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-bold text-lg text-gray-900 truncate">{beneficiary.name}</h4>
                                {beneficiary.is_verified && (
                                  <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-6 text-xs px-2">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('verified') || 'Verified'}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                {beneficiary.mobile_number && (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span className="truncate font-medium">{beneficiary.mobile_number}</span>
                                  </div>
                                )}
                                {beneficiary.national_id && (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <IdCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span className="truncate font-medium">{beneficiary.national_id}</span>
                                  </div>
                                )}
                                {beneficiary.city && (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{beneficiary.city}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right flex-shrink-0 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                            <div className="flex items-baseline gap-1">
                              <div className="text-lg font-bold text-gray-900">{beneficiary.total_cases || 0}</div>
                              <div className="text-xs text-gray-600">{t('cases') || 'cases'}</div>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <div className="text-base font-semibold text-green-600">{beneficiary.active_cases || 0}</div>
                              <div className="text-xs text-gray-600">{t('active') || 'active'}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Beneficiaries - Show when no search query and no results */}
            {!isSearching && !searchQuery && searchResults.length === 0 && (
              <>
                {isLoadingRecent ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium text-lg">{t('loading') || 'Loading...'}</p>
                  </div>
                ) : recentBeneficiaries.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <Label className="text-base font-semibold text-gray-800">
                        {t('recentBeneficiaries') || 'Recent Beneficiaries'}
                      </Label>
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                        {recentBeneficiaries.length}
                      </Badge>
                    </div>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {recentBeneficiaries.map((beneficiary, index) => (
                        <Card
                          key={beneficiary.id}
                          className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-300 border-2 bg-white group"
                          onClick={() => handleSelectFromResults(beneficiary)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                  <User className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h4 className="font-bold text-lg text-gray-900 truncate">{beneficiary.name}</h4>
                                    {beneficiary.is_verified && (
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-6 text-xs px-2">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('verified') || 'Verified'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    {beneficiary.mobile_number && (
                                      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <span className="truncate font-medium">{beneficiary.mobile_number}</span>
                                      </div>
                                    )}
                                    {beneficiary.national_id && (
                                      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                        <IdCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <span className="truncate font-medium">{beneficiary.national_id}</span>
                                      </div>
                                    )}
                                    {beneficiary.city && (
                                      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{beneficiary.city}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 text-right flex-shrink-0 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                                <div className="flex items-baseline gap-1">
                                  <div className="text-lg font-bold text-gray-900">{beneficiary.total_cases || 0}</div>
                                  <div className="text-xs text-gray-600">{t('cases') || 'cases'}</div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <div className="text-base font-semibold text-green-600">{beneficiary.active_cases || 0}</div>
                                  <div className="text-xs text-gray-600">{t('active') || 'active'}</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                    <CardContent className="pt-12 pb-12">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto shadow-inner">
                          <Search className="h-10 w-10 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-gray-700 font-semibold text-lg">{t('searchPrompt') || 'Enter a search term to find beneficiaries'}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {t('orCreateNew') || 'Or create a new beneficiary using the "Create New" button'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* No Results Message */}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                      <AlertCircle className="h-10 w-10 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-gray-700 font-semibold text-lg">{t('noResults') || 'No beneficiaries found'}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {t('tryDifferentSearch') || 'Try a different search term or create a new beneficiary'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Search Section - Only show when no beneficiary is selected */}
    {!selectedBeneficiary && (
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <Input
              placeholder={t('searchPlaceholder') || 'Search by name, mobile, or ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 h-11 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 animate-spin" />
            )}
          </div>
          <Button 
            onClick={() => setShowSearchDialog(true)}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4 mr-2" />
            {t('search') || 'Search'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 border-2 border-dashed hover:border-blue-500 hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-2" />
                {t('createNew') || 'Create New'}
              </Button>
            </DialogTrigger>
            <DialogContent className={cn(
              "max-h-[95vh] overflow-hidden p-0 flex flex-col",
              containerVariant === 'full' ? 'max-w-[98vw] w-full' : 'max-w-[1400px] w-[95vw]'
            )}>
              <DialogTitle className="sr-only">
                {t('createBeneficiary') || 'Create New Beneficiary'}
              </DialogTitle>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                {/* Header */}
                <EditPageHeader
                  backUrl="#"
                  icon={Plus}
                  title={t('createBeneficiary') || 'Create New Beneficiary'}
                  description={t('createDescription') || 'Create a profile for recurring cases'}
                  showBackButton={false}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateDialog(false)}
                      className="flex items-center gap-2 hover:bg-gray-100 transition-all duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Close</span>
                    </Button>
                  }
                />

                {/* Form Section */}
                <div className="w-full mt-6">
                  <BeneficiaryForm
                    ref={createFormRef}
                    mode="create"
                    onSubmit={handleCreateBeneficiary}
                    isSubmitting={isCreating}
                    idTypes={idTypes}
                    cities={cities}
                    showDocuments={true}
                    showFooter={false}
                    defaultValues={{
                      name: defaultName || '',
                      mobile_number: defaultMobileNumber || '',
                      national_id: defaultNationalId || ''
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-white px-4 sm:px-6 py-4">
                <EditPageFooter
                  primaryAction={{
                    label: t('createBeneficiary') || 'Create Beneficiary',
                    onClick: () => createFormRef.current?.submit(),
                    disabled: isCreating,
                    loading: isCreating,
                    icon: <Save className="h-4 w-4 mr-2" />
                  }}
                  secondaryActions={[
                    {
                      label: t('cancel') || 'Cancel',
                      onClick: () => setShowCreateDialog(false),
                      variant: 'outline'
                    }
                  ]}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('searchResults') || 'Search Results'} ({searchResults.length})
              </Label>
              <div className="space-y-2">
                {searchResults.map((beneficiary) => (
                  <Card
                    key={beneficiary.id}
                    className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200 border-2"
                    onClick={() => handleSelectFromResults(beneficiary)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h4 className="font-semibold text-base text-gray-900 truncate">{beneficiary.name}</h4>
                              {beneficiary.is_verified && (
                                <Badge variant="default" className="bg-green-600 h-5 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('verified') || 'Verified'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {beneficiary.mobile_number && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="truncate">{beneficiary.mobile_number}</span>
                                </div>
                              )}
                              {beneficiary.national_id && (
                                <div className="flex items-center gap-1.5">
                                  <IdCard className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="truncate">{beneficiary.national_id}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900">{beneficiary.total_cases || 0}</div>
                          <div className="text-xs text-gray-500">{t('cases') || 'cases'}</div>
                          <div className="text-sm font-semibold text-green-600">{beneficiary.active_cases || 0}</div>
                          <div className="text-xs text-gray-500">{t('active') || 'active'}</div>
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
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-900 text-base">{t('noResults') || 'No beneficiary found'}</h4>
                    <p className="text-sm text-amber-800 mt-1">
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

