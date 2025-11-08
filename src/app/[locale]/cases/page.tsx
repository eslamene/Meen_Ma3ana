'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  Target, 
  TrendingUp, 
  DollarSign,
  Users,
  AlertCircle
} from 'lucide-react'
import CaseCard from '@/components/cases/CaseCard'
import FilterSidebar from '@/components/cases/FilterSidebar'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface Case {
  id: string
  title: string
  titleEn?: string
  titleAr?: string
  description: string
  descriptionEn?: string
  descriptionAr?: string
  targetAmount: number
  currentAmount: number
  status: string
  category: string
  type: 'one-time' | 'recurring'
  location: string
  createdAt: string
  updatedAt: string
  beneficiaryName: string
  priority: string
}

interface CaseFilters {
  search: string
  type: string
  status: string
  category: string
  minAmount: string
  maxAmount: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function CasesPage() {
  const t = useTranslations('cases')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { canCreateCase } = usePermissions()

  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CaseFilters>({
    search: '',
    type: 'all',
    status: 'published',
    category: 'all',
    minAmount: '',
    maxAmount: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })
  const [statistics, setStatistics] = useState({
    totalCases: 0,
    activeCases: 0,
    totalRaised: 0
  })

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching cases...')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '12',
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: filters.sortOrder || 'desc'
      })

      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type)
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category)
      }
      if (filters.minAmount) {
        params.append('minAmount', filters.minAmount)
      }
      if (filters.maxAmount) {
        params.append('maxAmount', filters.maxAmount)
      }

      const response = await fetch(`/api/cases?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch cases')
      }

      const data = await response.json()
      console.log('Cases data:', data)
      
      // Debug: Log first case's language fields
      if (data.cases && data.cases.length > 0) {
        const firstCase = data.cases[0]
        console.log('First case language fields:', {
          titleEn: firstCase.titleEn,
          titleAr: firstCase.titleAr,
          descriptionEn: firstCase.descriptionEn,
          descriptionAr: firstCase.descriptionAr,
          locale: params.locale
        })
      }
      
      setCases(data.cases || [])
      setPagination(data.pagination || {})
      setStatistics(data.statistics || { totalCases: 0, activeCases: 0, totalRaised: 0 })
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
      console.log('Fetch completed, loading set to false')
    }
  }, [filters, pagination.page])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const handleFilterChange = (key: keyof CaseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      status: 'published',
      category: 'all',
      minAmount: '',
      maxAmount: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleApplyFilters = () => {
    fetchCases()
  }

  const handleViewDetails = (caseId: string) => {
    router.push(`/${locale}/cases/${caseId}`)
  }

  const handleFavorite = (caseId: string) => {
    // TODO: Implement favorite functionality
    console.log('Toggle favorite for case:', caseId)
  }

  const handleCreateCase = () => {
    router.push(`/${locale}/cases/create`)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.type && filters.type !== 'all') count++
    if (filters.status && filters.status !== 'published') count++
    if (filters.category && filters.category !== 'all') count++
    if (filters.minAmount) count++
    if (filters.maxAmount) count++
    return count
  }

  // Statistics are now calculated from all filtered cases, not just the current page
  const getTotalRaised = () => {
    return statistics.totalRaised
  }

  const getActiveCases = () => {
    return statistics.activeCases
  }

  const getTotalCases = () => {
    return statistics.totalCases
  }

  // Generate pagination page numbers with ellipses
  const getPaginationPages = () => {
    const { page, totalPages } = pagination
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      // Calculate start and end of visible range around current page
      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)
      
      // Adjust range to show more pages if we're near the edges
      if (page <= 3) {
        end = Math.min(5, totalPages - 1)
      } else if (page >= totalPages - 2) {
        start = Math.max(totalPages - 4, 2)
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis-start')
      }
      
      // Add visible pages around current page
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis-end')
      }
      
      // Always show last page
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <PermissionGuard permissions={["view:cases"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view cases.</p>
            <Button onClick={() => router.push(`/${locale}/`)}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {t('browseCases')}
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    {t('browseCasesDescription')}
                  </p>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('activeCases')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{getActiveCases()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('totalRaised')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                          EGP {getTotalRaised().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('totalCases')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{getTotalCases()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {canCreateCase && (
              <Button 
                onClick={handleCreateCase} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg"
              >
                <Plus className="h-5 w-5" />
                {t('createCase')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Enhanced Filter Sidebar */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              onApplyFilters={handleApplyFilters}
              isOpen={showFilters}
              onToggle={() => setShowFilters(!showFilters)}
              activeFiltersCount={getActiveFiltersCount()}
            />
          </div>

          {/* Enhanced Main Content */}
          <div className="flex-1 min-w-0">
            {/* Enhanced Search and View Controls */}
            <Card className="mb-4 sm:mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Enhanced Search Bar */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder={t('searchCases')}
                        value={filters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-12 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Enhanced View Mode Toggle */}
                  <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="lg"
                      onClick={() => setViewMode('grid')}
                      className={`rounded-r-none px-6 ${viewMode === 'grid' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'hover:bg-gray-50'}`}
                    >
                      <Grid className="h-5 w-5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="lg"
                      onClick={() => setViewMode('list')}
                      className={`rounded-l-none px-6 ${viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'hover:bg-gray-50'}`}
                    >
                      <List className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Results Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm">
                  {loading ? t('loading') : t('showingResults', { count: cases.length, total: pagination.total })}
                </div>
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1">
                    {getActiveFiltersCount()} {t('filters')} {t('active')}
                  </Badge>
                )}
              </div>

              <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger className="w-48 border-2 border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">{t('sortByDate')}</SelectItem>
                  <SelectItem value="amount">{t('sortByAmount')}</SelectItem>
                  <SelectItem value="priority">{t('sortByPriority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Cases Grid/List */}
            {loading ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
                : 'space-y-3'
              }>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-3"></div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : cases.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('noCasesFound')}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('noCasesFoundDescription')}
                  </p>
                  {canCreateCase && (
                    <Button 
                      onClick={handleCreateCase}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createCase')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
                : 'space-y-3'
              }>
                {cases.map((caseItem) => (
                  <CaseCard
                    key={caseItem.id}
                    caseItem={caseItem}
                    onViewDetails={handleViewDetails}
                    onFavorite={handleFavorite}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}

            {/* Enhanced Pagination with Ellipses */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        variant="outline"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="border-2 border-gray-200 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('previous')}
                      </Button>
                      
                      {getPaginationPages().map((pageNum, index) => {
                        if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 text-gray-500 font-medium"
                            >
                              ...
                            </span>
                          )
                        }
                        
                        const page = pageNum as number
                        const isActive = pagination.page === page
                        
                        return (
                          <Button
                            key={page}
                            variant={isActive ? 'default' : 'outline'}
                            onClick={() => setPagination(prev => ({ ...prev, page }))}
                            className={
                              isActive
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-md'
                                : 'border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                            }
                            size="sm"
                          >
                            {page}
                          </Button>
                        )
                      })}
                      
                      <Button
                        variant="outline"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="border-2 border-gray-200 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('next')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  )
} 