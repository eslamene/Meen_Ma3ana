'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Plus, Search, Filter, User, Phone, MapPin, Calendar, Eye, Edit, Trash2, Mail, CheckCircle, Users, LayoutDashboard, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LookupService } from '@/lib/services/lookupService'
import { toast } from 'sonner'
import type { Beneficiary } from '@/types/beneficiary'
import type { City, IdType } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'
import BulkUploadModal from '@/components/beneficiaries/BulkUploadModal'

export default function BeneficiariesPage() {
  const t = useTranslations('beneficiaries')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { containerVariant } = useLayout()
  
  // State
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cities, setCities] = useState<City[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [assignedCases, setAssignedCases] = useState<Array<{ id: string; title: string }>>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  // Load beneficiaries function
  const loadBeneficiaries = async () => {
    try {
      setLoading(true)
      const beneficiariesResponse = await fetch('/api/beneficiaries?limit=1000').then(res => res.json())
      
      if (beneficiariesResponse.success && beneficiariesResponse.data) {
        setBeneficiaries(beneficiariesResponse.data)
        setFilteredBeneficiaries(beneficiariesResponse.data)
      }
    } catch (error) {
      logger.error('Error loading beneficiaries:', error)
      toast.error('Failed to load beneficiaries')
    } finally {
      setLoading(false)
    }
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [beneficiariesResponse, citiesData] = await Promise.all([
          fetch('/api/beneficiaries?limit=1000').then(res => res.json()),
          LookupService.getCities(),
          LookupService.getIdTypes()
        ])
        
        if (beneficiariesResponse.success && beneficiariesResponse.data) {
          setBeneficiaries(beneficiariesResponse.data)
          setFilteredBeneficiaries(beneficiariesResponse.data)
        } else {
          logger.error('Error loading beneficiaries', beneficiariesResponse.error, {
            area: 'beneficiaries',
            operation: 'loadData',
          })
        }
        setCities(citiesData)
      } catch (error) {
        logger.error('Error loading data', error, {
          area: 'beneficiaries',
          operation: 'loadData',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter beneficiaries
  useEffect(() => {
    let filtered = beneficiaries

    if (searchQuery) {
      filtered = filtered.filter(beneficiary =>
        beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.mobile_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.national_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (cityFilter && cityFilter !== 'all') {
      filtered = filtered.filter(beneficiary => beneficiary.city_id === cityFilter)
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(beneficiary => beneficiary.risk_level === statusFilter)
    }

    setFilteredBeneficiaries(filtered)
  }, [beneficiaries, searchQuery, cityFilter, statusFilter])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleViewBeneficiary = (beneficiary: Beneficiary) => {
    router.push(`/${locale}/case-management/beneficiaries/${beneficiary.id}`)
  }

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    router.push(`/${locale}/case-management/beneficiaries/${beneficiary.id}/edit`)
  }

  const handleDeleteBeneficiary = async (beneficiary: Beneficiary) => {
    try {
      setDeleting(true)
      
      // Use API endpoint to bypass RLS (same as create/update)
      const response = await fetch(`/api/beneficiaries/${beneficiary.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        type ErrorData = {
          error?: string
          details?: string | { assignedCasesCount?: number; assignedCases?: Array<{ id: string; title: string }> }
          assignedCasesCount?: number
          assignedCases?: Array<{ id: string; title: string }>
        }
        let errorData: ErrorData = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorData = { 
            error: response.statusText || 'Failed to delete beneficiary',
            details: `HTTP ${response.status}: ${response.statusText}`
          }
        }
        
        // Build detailed error message
        const errorMessage = errorData.error || 'Failed to delete beneficiary'
        let errorDetails = typeof errorData.details === 'string' ? errorData.details : ''
        
        // Extract assignedCasesCount from details if it's an object, or from top level
        const assignedCasesCount = errorData.assignedCasesCount ?? (typeof errorData.details === 'object' && errorData.details !== null && !Array.isArray(errorData.details) ? (errorData.details as { assignedCasesCount?: number }).assignedCasesCount : undefined)
        const assignedCases = errorData.assignedCases ?? (typeof errorData.details === 'object' && errorData.details !== null && !Array.isArray(errorData.details) ? (errorData.details as { assignedCases?: Array<{ id: string; title: string }> }).assignedCases : undefined)
        
        // Add specific context based on error type
        if (assignedCasesCount !== undefined && assignedCasesCount > 0) {
          errorDetails = `This beneficiary is currently assigned to ${assignedCasesCount} case(s). Please remove the beneficiary from all cases before attempting to delete.`
          // Store assigned cases for display in dialog
          if (assignedCases && Array.isArray(assignedCases)) {
            setAssignedCases(assignedCases)
          }
        } else if (response.status === 404) {
          errorDetails = 'The beneficiary may have already been deleted or does not exist.'
        } else if (response.status === 500) {
          errorDetails = 'A server error occurred while attempting to delete the beneficiary. Please try again later or contact support if the issue persists.'
        } else if (response.status === 400) {
          errorDetails = errorData.error || 'The request was invalid. Please check the beneficiary data and try again.'
        }
        
        // Log detailed error for debugging (only for unexpected errors, not validation errors)
        // 400 status is expected for validation errors, so log as warning instead
        if (response.status >= 500) {
          console.error('Error deleting beneficiary:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            details: errorDetails,
            assignedCasesCount: assignedCasesCount,
            fullErrorData: errorData
          })
        } else if (response.status === 400) {
          // Log validation errors as info (expected behavior)
          console.info('Beneficiary deletion blocked:', {
            status: response.status,
            reason: errorDetails || errorMessage,
            assignedCasesCount: assignedCasesCount
          })
        }
        
        // Show detailed error to user
        toast.error('Delete Failed', {
          description: errorDetails || errorMessage,
          duration: 6000 // Show for longer to allow reading
        })
        
        return // Exit early to prevent state updates
      }
      
      toast.success('Beneficiary Deleted', {
        description: `Beneficiary "${beneficiary.name || 'Untitled'}" has been deleted successfully.`
      })
      
      // Remove from local state
      setBeneficiaries(prev => prev.filter(b => b.id !== beneficiary.id))
      setFilteredBeneficiaries(prev => prev.filter(b => b.id !== beneficiary.id))
      setIsDeleteDialogOpen(false)
      setSelectedBeneficiary(null)
      setAssignedCases([])
    } catch (error) {
      // Only log actual exceptions/errors, not expected API responses
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string'
        ? error
        : 'An unexpected error occurred while deleting the beneficiary.'
      
      // Log error details only if it's a real error
      if (error instanceof Error) {
        console.error('Unexpected error deleting beneficiary:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      } else if (error && typeof error === 'object') {
        // Log non-Error objects with their properties
        logger.error('Unexpected error deleting beneficiary', error, {
          area: 'beneficiaries',
          operation: 'handleDeleteBeneficiary',
        })
      } else {
        // Log primitive errors
        logger.error('Unexpected error deleting beneficiary', undefined, {
          area: 'beneficiaries',
          operation: 'handleDeleteBeneficiary',
          errorMessage,
        })
      }
      
      toast.error('Delete Failed', {
        description: `${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
        duration: 6000
      })
    } finally {
      setDeleting(false)
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Group beneficiaries alphabetically
  const groupByLetter = (beneficiaries: Beneficiary[]) => {
    const groups: Record<string, Beneficiary[]> = {}
    
    beneficiaries.forEach(beneficiary => {
      // Get first letter of name (handle Arabic and English)
      const firstChar = beneficiary.name.trim().charAt(0).toUpperCase()
      // Use '#' for non-alphabetic characters
      const letter = /[A-Za-z\u0600-\u06FF]/.test(firstChar) ? firstChar : '#'
      const key = letter
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(beneficiary)
    })
    
    // Sort each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    // Sort letter groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    
    return { groups, sortedKeys }
  }

  // Get grouped beneficiaries
  const { groups, sortedKeys } = groupByLetter(filteredBeneficiaries)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary sm:h-10 sm:w-10"></div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14">
                <Users className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {t('title') || 'Beneficiaries'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {t('subtitle') || 'Manage beneficiary profiles and documents'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsBulkUploadOpen(true)} 
                className="text-sm sm:text-base px-3 sm:px-4 h-9 sm:h-10 flex-shrink-0"
              >
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            <Button
                onClick={() => router.push(`/${locale}/case-management/beneficiaries/create`)} 
              className="text-sm sm:text-base px-3 sm:px-4 h-9 sm:h-10 flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">{t('addBeneficiary') || 'Add Beneficiary'}</span>
              <span className="sm:hidden">Add</span>
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('filters') || 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-2 sm:pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                {t('search') || 'Search'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
                <Input
                  placeholder={t('searchPlaceholder') || 'Search by name, mobile, ID...'}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                {t('city') || 'City'}
              </label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t('allCities') || 'All Cities'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCities') || 'All Cities'}</SelectItem>
                  {cities.filter(city => city.id && city.id.trim() !== '').map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                {t('riskLevel') || 'Risk Level'}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t('allLevels') || 'All Levels'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allLevels') || 'All Levels'}</SelectItem>
                  <SelectItem value="low">{t('low') || 'Low'}</SelectItem>
                  <SelectItem value="medium">{t('medium') || 'Medium'}</SelectItem>
                  <SelectItem value="high">{t('high') || 'High'}</SelectItem>
                  <SelectItem value="critical">{t('critical') || 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setCityFilter('all')
                  setStatusFilter('all')
                }}
                className="w-full text-sm h-9 sm:h-10"
              >
                {t('clearFilters') || 'Clear Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredBeneficiaries.length > 0 && (
        <div className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
          Showing {filteredBeneficiaries.length} {filteredBeneficiaries.length === 1 ? 'beneficiary' : 'beneficiaries'}
          {searchQuery || cityFilter !== 'all' || statusFilter !== 'all' ? ' (filtered)' : ''}
                  </div>
      )}

      {/* Address Book Style List */}
      <div className="relative">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {sortedKeys.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium text-foreground">
                  {t('noBeneficiaries') || 'No beneficiaries found'}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {searchQuery || cityFilter !== 'all' || statusFilter !== 'all'
                    ? t('noBeneficiariesFiltered') || 'Try adjusting your filters'
                    : t('noBeneficiariesDescription') || 'Get started by adding your first beneficiary'
                  }
                </p>
                <Button onClick={() => router.push(`/${locale}/case-management/beneficiaries/create`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addFirstBeneficiary') || 'Add First Beneficiary'}
                </Button>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-300px)] divide-y divide-border overflow-y-auto">
                {sortedKeys.map((letter) => (
                  <div key={letter} id={`letter-${letter}`}>
                    {/* Letter Header */}
                    <div className="sticky top-0 z-10 border-b-2 border-border bg-muted/80 px-4 py-2 shadow-sm backdrop-blur-sm sm:px-6 sm:py-2.5">
                      <h2 className="text-sm font-bold tracking-wide text-foreground sm:text-base">{letter}</h2>
                    </div>
                  
                  {/* Beneficiaries in this letter group */}
                  <div className="divide-y divide-border/70">
                    {groups[letter].map((beneficiary) => (
                      <div
                        key={beneficiary.id}
                        className="group relative border-b border-border/60 bg-card transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Avatar with Initials */}
                              <div className="relative flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm ring-2 ring-border transition-all group-hover:ring-ring sm:h-11 sm:w-11 sm:text-sm">
                              {getInitials(beneficiary.name)}
                  </div>
                              {beneficiary.is_verified && (
                                <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
                                  <CheckCircle className="h-2 w-2 text-white" />
                                </div>
                              )}
                </div>
                          
                          {/* Name and Info */}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {beneficiary.name}
                              </h3>
                                <Badge className={`${getRiskLevelColor(beneficiary.risk_level)} text-[9px] sm:text-[10px] font-medium py-0 px-1.5 flex-shrink-0`}>
                  {t(beneficiary.risk_level) || beneficiary.risk_level}
                </Badge>
              </div>
            
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3 sm:text-sm">
                {beneficiary.mobile_number && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  <span className="truncate">{beneficiary.mobile_number}</span>
                                </div>
                              )}
                              
                              {beneficiary.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                    <span className="truncate max-w-[150px] sm:max-w-none">{beneficiary.email}</span>
                  </div>
                )}
                
                {beneficiary.city && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  <span className="truncate">{beneficiary.city}</span>
                  </div>
                )}
                
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  <span className="text-[10px] sm:text-xs">{formatDate(beneficiary.created_at)}</span>
                                </div>
                              </div>
                </div>
              </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                              variant="ghost"
                  size="sm"
                  onClick={() => handleViewBeneficiary(beneficiary)}
                              className="h-7 w-7 p-0 hover:bg-muted hover:text-primary sm:h-8 sm:w-8"
                              title={t('view') || 'View'}
                >
                              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                              variant="ghost"
                  size="sm"
                  onClick={() => handleEditBeneficiary(beneficiary)}
                              className="h-7 w-7 p-0 hover:bg-muted hover:text-primary sm:h-8 sm:w-8"
                              title={t('edit') || 'Edit'}
                >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                              variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBeneficiary(beneficiary)
                    setIsDeleteDialogOpen(true)
                  }}
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 sm:h-8 sm:w-8"
                              title={t('delete') || 'Delete'}
                >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
        ))}
      </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Navigation Sidebar - Only show if many letters */}
        {sortedKeys.length > 5 && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
            <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
              <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
                {sortedKeys.map((letter) => (
                  <button
                    key={letter}
                    onClick={(e) => {
                      e.preventDefault()
                      const element = document.getElementById(`letter-${letter}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    className="min-w-[24px] rounded px-2 py-1 text-center text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    title={`Jump to ${letter}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) {
          setAssignedCases([])
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteBeneficiary') || 'Delete Beneficiary'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {t('deleteConfirmation') || 'Are you sure you want to delete this beneficiary? This action cannot be undone.'}
            </p>
            {selectedBeneficiary && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="font-medium">{selectedBeneficiary.name}</p>
                <p className="text-sm text-muted-foreground">{selectedBeneficiary.mobile_number}</p>
              </div>
            )}
            {assignedCases.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  This beneficiary is assigned to {assignedCases.length} case(s):
                </p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {assignedCases.map((caseItem) => (
                    <li key={caseItem.id} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="font-mono text-muted-foreground">#{caseItem.id.slice(0, 8)}</span>
                      <span className="truncate">{caseItem.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBeneficiary && handleDeleteBeneficiary(selectedBeneficiary)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete') || 'Delete'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={loadBeneficiaries}
      />
      </Container>
    </div>
  )
}
