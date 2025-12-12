'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  Target, 
  TrendingUp, 
  DollarSign,
  Users,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'
import CaseCard from '@/components/cases/CaseCard'
import FilterSidebar from '@/components/cases/FilterSidebar'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { useAdmin } from '@/lib/admin/hooks'
import { useInfiniteScrollPagination } from '@/hooks/useInfiniteScrollPagination'
import { theme, brandColors } from '@/lib/theme'
import Pagination from '@/components/ui/pagination'

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
  categoryData?: { name: string; icon?: string; color?: string } | null
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
  detectedCategory: string
  minAmount: string
  maxAmount: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function CasesPage() {
  const t = useTranslations('cases')
  const tNav = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { hasPermission } = useAdmin()
  const { containerVariant } = useLayout()
  // Check if user can create cases
  const canCreateCase = hasPermission('cases:create')

  const [cases, setCases] = useState<Case[]>([])
  const [allLoadedCases, setAllLoadedCases] = useState<Case[]>([]) // Accumulate all loaded cases for scroll pagination
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CaseFilters>({
    search: '',
    type: 'all',
    status: 'published',
    category: 'all',
    detectedCategory: 'all',
    minAmount: '',
    maxAmount: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false) // Collapsed by default on mobile
  const [serverPagination, setServerPagination] = useState({
    total: 0,
    totalPages: 0
  })
  const [statistics, setStatistics] = useState({
    totalCases: 0,
    activeCases: 0,
    totalRaised: 0
  })

  // Fetch cases function - accepts page and limit for pagination hook
  const fetchCases = useCallback(async (page: number, limit: number) => {
    try {
      setLoading(true)
      console.log('Fetching cases...')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
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
      if (filters.detectedCategory && filters.detectedCategory !== 'all') {
        params.append('detectedCategory', filters.detectedCategory)
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
          locale: params.get('locale') || locale
        })
      }
      
      const newCases = data.cases || []
      
      // If loading more (page > 1), accumulate cases; otherwise replace
      if (page > 1) {
        setAllLoadedCases(prev => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(prev.map((c: Case) => c.id))
          const uniqueNewCases = newCases.filter((c: Case) => !existingIds.has(c.id))
          return [...prev, ...uniqueNewCases]
        })
      } else {
        // First page or filter change - replace all cases
        setAllLoadedCases(newCases)
      }
      
      setCases(newCases)
      setServerPagination(data.pagination || { total: 0, totalPages: 0 })
      setStatistics(data.statistics || { totalCases: 0, activeCases: 0, totalRaised: 0 })
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
      console.log('Fetch completed, loading set to false')
    }
  }, [filters, locale])

  // Use pagination hook for server-side pagination with Load More button
  const pagination = useInfiniteScrollPagination({
    initialPage: 1,
    initialItemsPerPage: 12,
    onFetch: fetchCases,
    resetDependencies: [filters.search, filters.type, filters.status, filters.category, filters.detectedCategory, filters.minAmount, filters.maxAmount, filters.sortBy, filters.sortOrder],
    externalLoading: loading,
    totalPages: serverPagination.totalPages,
    useLoadMoreButton: true // Use Load More button instead of infinite scroll
  })

  // Initial fetch on mount and when filters change
  useEffect(() => {
    if (pagination.state.scrollItemsPerPage !== null && pagination.state.currentPage === 1) {
      fetchCases(1, pagination.state.effectiveItemsPerPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.state.scrollItemsPerPage])

  const handleFilterChange = (key: keyof CaseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    pagination.actions.reset() // Reset to first page
    setAllLoadedCases([]) // Clear accumulated cases on filter change
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    pagination.actions.reset()
    setAllLoadedCases([]) // Clear accumulated cases on search
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      status: 'published',
      category: 'all',
      detectedCategory: 'all',
      minAmount: '',
      maxAmount: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    pagination.actions.reset()
    setAllLoadedCases([]) // Clear accumulated cases
  }

  const handleApplyFilters = () => {
    pagination.actions.reset()
    setAllLoadedCases([])
  }

  const handleViewDetails = (caseId: string) => {
    router.push(`/${locale}/cases/${caseId}`)
  }

  const handleFavorite = (caseId: string) => {
    // TODO: Implement favorite functionality
    console.log('Toggle favorite for case:', caseId)
  }

  const handleCreateCase = () => {
    router.push(`/${locale}/case-management/create`)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.type && filters.type !== 'all') count++
    if (filters.status && filters.status !== 'published') count++
    if (filters.category && filters.category !== 'all') count++
    if (filters.detectedCategory && filters.detectedCategory !== 'all') count++
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


  return (
    <PermissionGuard permissions={["cases:view"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-ma3ana mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view cases.</p>
            <Button onClick={() => router.push(`/${locale}/`)}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
        <Container variant={containerVariant} className="py-3 sm:py-6 lg:py-10">
        {/* Enhanced Header - Breadcrumbs are now in the fixed header bar */}
        <div className="mb-3 sm:mb-6 lg:mb-10 w-full">
          {/* Title Section with Enhanced Design - Compact on Mobile */}
          <div className="mb-2 sm:mb-4 lg:mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-1.5 sm:gap-3 lg:gap-6 mb-2 sm:mb-4 lg:mb-8">
              <div className="flex items-start gap-2 sm:gap-3 lg:gap-5 flex-1 min-w-0">
                {/* Enhanced Icon Container - Smaller on Mobile */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="p-1.5 sm:p-2.5 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center"
                    style={{ 
                      background: theme.gradients.primary,
                      boxShadow: theme.shadows.primary
                    }}
                  >
                    <Target className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div 
                    className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: brandColors.ma3ana[500] }}
                  />
                </div>
                
                {/* Title and Description - Compact on Mobile */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-0.5 sm:mb-1.5 lg:mb-3">
                    <h1 className="text-lg sm:text-2xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent break-words leading-tight flex-1">
                      {t('browseCases')}
                    </h1>
                    {/* Statistics Button - Inline with Title on Mobile */}
                    <Collapsible 
                      open={statsExpanded} 
                      onOpenChange={setStatsExpanded}
                      className="sm:hidden"
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-1 h-7 px-2 border border-gray-200 hover:border-meen hover:bg-meen-50 rounded-md font-medium transition-all duration-200 text-[10px] flex-shrink-0"
                        >
                          <TrendingUp className="h-3 w-3 text-meen-600" />
                          <Badge variant="secondary" className="bg-meen-100 text-meen-800 border-meen-200 text-[9px] px-0.5 py-0 h-3.5">
                            3
                          </Badge>
                          {statsExpanded ? (
                            <ChevronUp className="h-2.5 w-2.5 text-gray-500 ml-0.5" />
                          ) : (
                            <ChevronDown className="h-2.5 w-2.5 text-gray-500 ml-0.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </div>
                  <p className="text-[10px] sm:text-sm lg:text-xl text-gray-600 break-words leading-relaxed max-w-2xl hidden sm:block">
                    {t('browseCasesDescription')}
                  </p>
                </div>
              </div>
              
              {/* Create Case button - Desktop */}
              {canCreateCase && (
                <div className="hidden md:block flex-shrink-0">
                  <Button 
                    onClick={handleCreateCase} 
                    style={{ background: theme.gradients.primary, boxShadow: theme.shadows.primary }}
                    className="flex items-center gap-2 text-white hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-xl text-base font-semibold h-auto"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.gradients.primary
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <Plus className="h-5 w-5" />
                    {t('createCase')}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Collapsible Statistics Content - Mobile Only - Below title row */}
            <Collapsible 
              open={statsExpanded} 
              onOpenChange={setStatsExpanded}
              className="sm:hidden w-full"
            >
              <CollapsibleContent className="w-full">
                <div className="grid grid-cols-1 gap-2 w-full">
                  {/* Active Cases Card - Ultra Compact Mobile */}
                  <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white via-white to-meen-50/30">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-meen-100/20 rounded-full -mr-10 -mt-10" />
                    <CardContent className="p-2 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <div 
                          className="p-1.5 rounded shadow-sm"
                          style={{ backgroundColor: brandColors.meen[100] }}
                        >
                          <TrendingUp className="h-3.5 w-3.5" style={{ color: brandColors.meen[600] }} />
                        </div>
                        <div className="text-[10px] font-semibold text-meen-600 bg-meen-50 px-1 py-0.5 rounded-full">
                          Active
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5 font-medium">{t('activeCases')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {getActiveCases()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Total Cases Card - Ultra Compact Mobile */}
                  <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white via-white to-purple-50/30">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100/20 rounded-full -mr-10 -mt-10" />
                    <CardContent className="p-2 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="p-1.5 bg-purple-100 rounded shadow-sm">
                          <Users className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <div className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1 py-0.5 rounded-full">
                          Total
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5 font-medium">{t('totalCases')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {getTotalCases()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Total Raised Card - Ultra Compact Mobile */}
                  <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white via-white to-ma3ana-50/30">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-ma3ana-100/20 rounded-full -mr-10 -mt-10" />
                    <CardContent className="p-2 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <div 
                          className="p-1.5 rounded shadow-sm"
                          style={{ backgroundColor: brandColors.ma3ana[100] }}
                        >
                          <DollarSign className="h-3.5 w-3.5" style={{ color: brandColors.ma3ana[600] }} />
                        </div>
                        <div className="text-[10px] font-semibold text-ma3ana-600 bg-ma3ana-50 px-1 py-0.5 rounded-full">
                          Raised
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5 font-medium">{t('totalRaised')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          EGP {getTotalRaised().toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Enhanced Stats Cards with Gradients - Desktop/Tablet (Always Visible) */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 w-full">
              {/* Active Cases Card */}
              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-white to-meen-50/30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-meen-100/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <CardContent className="p-5 sm:p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 rounded-xl shadow-md"
                      style={{ backgroundColor: brandColors.meen[100] }}
                    >
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                    <div className="text-xs font-semibold text-meen-600 bg-meen-50 px-2 py-1 rounded-full">
                      Active
                    </div>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-600 mb-1 font-medium">{t('activeCases')}</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      {getActiveCases()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Total Cases Card */}
              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-white to-purple-50/30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <CardContent className="p-5 sm:p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl shadow-md">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <div className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      Total
                    </div>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-600 mb-1 font-medium">{t('totalCases')}</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      {getTotalCases()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Total Raised Card */}
              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-white to-ma3ana-50/30 sm:col-span-2 lg:col-span-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-ma3ana-100/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <CardContent className="p-5 sm:p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 rounded-xl shadow-md"
                      style={{ backgroundColor: brandColors.ma3ana[100] }}
                    >
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                    <div className="text-xs font-semibold text-ma3ana-600 bg-ma3ana-50 px-2 py-1 rounded-full">
                      Raised
                    </div>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-600 mb-1 font-medium">{t('totalRaised')}</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      EGP {getTotalRaised().toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex flex-col 2xl:flex-row gap-4 sm:gap-6">
          {/* FilterSidebar - Desktop sidebar shows on >= 1600px, bottom sheet (fixed) shows on < 1600px */}
          <div className="hidden 2xl:block 2xl:w-80 2xl:flex-shrink-0">
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

          {/* FilterSidebar bottom sheet - Always rendered, fixed positioned, visible on < 1600px */}
          <div className="2xl:hidden">
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
            {/* Combined Search, Filter, Create, View Toggle - Single Row on Mobile */}
            <Card className="mb-2 sm:mb-4 lg:mb-6 bg-white/95 backdrop-blur-sm border-0 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transition-shadow duration-300">
              <CardContent className="p-2 sm:p-3 lg:p-6 relative">
                {/* Single Row Layout - Search and Filter side by side on all screens */}
                <div className="flex flex-row gap-2 sm:gap-3 lg:gap-4">
                  {/* Search Bar - Takes available space */}
                  <div className="flex-1 min-w-0">
                    <div className="relative group">
                      <Search className="absolute left-2.5 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-5 sm:w-5 group-focus-within:text-meen transition-colors" />
                      <Input
                        placeholder={t('searchCases')}
                        value={filters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-8 sm:pl-12 lg:pl-14 h-9 sm:h-10 lg:h-14 text-xs sm:text-sm border-2 border-gray-200 focus:border-meen focus:ring-2 focus:ring-meen-200 rounded-lg sm:rounded-xl transition-all duration-200 bg-white/50 hover:bg-white"
                        style={{ '--tw-ring-color': brandColors.meen[200] } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  {/* Filter Button - Icon only on mobile, full text on larger screens */}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex 2xl:hidden h-9 sm:h-10 lg:h-14 px-2 sm:px-3 lg:px-6 border-2 border-gray-200 hover:border-meen hover:bg-meen-50 rounded-lg sm:rounded-xl whitespace-nowrap font-medium transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm flex-shrink-0"
                  >
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('filters')}</span>
                    {getActiveFiltersCount() > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-1 sm:ml-1.5 bg-meen-500 text-white px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold shadow-sm"
                        style={{ backgroundColor: brandColors.meen[500] }}
                      >
                        {getActiveFiltersCount()}
                      </Badge>
                    )}
                  </Button>

                  {/* Action Buttons Row - Create Case and View Toggle */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

                    {/* Create Case Button - Mobile only, Compact */}
                    {canCreateCase && (
                      <Button 
                        onClick={handleCreateCase}
                        style={{ background: theme.gradients.primary, boxShadow: theme.shadows.primary }}
                        className="md:hidden flex items-center gap-1 text-white shadow-md hover:shadow-lg transition-all duration-200 px-2 py-0 h-9 rounded-lg text-xs flex-shrink-0"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = theme.gradients.primary
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Create</span>
                      </Button>
                    )}
                    
                    {/* View Mode Toggle - Hidden on Mobile */}
                    <div className="hidden sm:flex border-2 border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="lg"
                        onClick={() => setViewMode('grid')}
                        style={viewMode === 'grid' ? { background: theme.gradients.primary } : {}}
                        className={`rounded-r-none px-2 sm:px-3 md:px-6 h-9 sm:h-10 md:h-12 ${viewMode === 'grid' ? 'text-white' : 'hover:bg-gray-50'}`}
                      >
                        <Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="lg"
                        onClick={() => setViewMode('list')}
                        style={viewMode === 'list' ? { background: theme.gradients.primary } : {}}
                        className={`rounded-l-none px-2 sm:px-3 md:px-6 h-9 sm:h-10 md:h-12 ${viewMode === 'list' ? 'text-white' : 'hover:bg-gray-50'}`}
                      >
                        <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Results Count - Below search bar on all screen sizes */}
                <div className="flex items-center justify-end mt-2 sm:mt-3">
                  <div className="text-[10px] sm:text-xs lg:text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-2 sm:px-2.5 lg:px-4 py-0.5 sm:py-1 lg:py-2 rounded-md sm:rounded-lg shadow-sm whitespace-nowrap">
                    {loading ? t('loading') : t('showingResults', { count: pagination.state.isMobile ? allLoadedCases.length : cases.length, total: serverPagination.total })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Cases Grid/List */}
            {loading ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6'
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
                      style={{ background: theme.gradients.primary }}
                      className="text-white"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = theme.gradients.primary
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createCase')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div 
                  id="cases-container"
                  className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6'
                    : 'space-y-3'
                  }
                >
                  {/* On mobile, show accumulated cases; on desktop, show current page cases */}
                  {(pagination.state.isMobile ? allLoadedCases : cases).map((caseItem) => (
                    <CaseCard
                      key={caseItem.id}
                      caseItem={caseItem}
                      onViewDetails={handleViewDetails}
                      onFavorite={handleFavorite}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {/* Load More button for mobile */}
                {pagination.showLoadMoreButton && (
                  <div className="flex justify-center py-4 sm:hidden">
                    <Button
                      onClick={pagination.handleLoadMore}
                      disabled={pagination.state.isLoadingMore || loading}
                      style={{ background: theme.gradients.primary }}
                      className="text-white min-w-[120px]"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = theme.gradients.primary
                      }}
                    >
                      {pagination.state.isLoadingMore || loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
                
                {/* End of list indicator on mobile */}
                {pagination.state.currentPage >= serverPagination.totalPages && allLoadedCases.length > 0 && (
                  <div className="text-center py-4 text-sm text-gray-500 sm:hidden">
                    You&apos;ve reached the end of the list
                  </div>
                )}
              </>
            )}

            {/* Unified Pagination - Hidden on mobile, shown on desktop */}
            {serverPagination.totalPages > 1 && (
              <div className="flex justify-center mt-8 hidden sm:flex">
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <Pagination
                      page={pagination.state.currentPage}
                      totalPages={serverPagination.totalPages}
                      total={serverPagination.total}
                      limit={pagination.state.itemsPerPage}
                      onPageChange={(newPage) => {
                        pagination.actions.setCurrentPage(newPage)
                      }}
                      showItemCount={false}
                      scrollToTop={true}
                      maxVisiblePages={7}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Mobile pagination info - always visible on mobile */}
            {serverPagination.totalPages > 1 && (
              <div className="sm:hidden mt-4 text-center text-xs text-gray-600">
                Showing {allLoadedCases.length} of {serverPagination.total} cases
              </div>
            )}
          </div>
        </div>
        </Container>
      </div>
    </PermissionGuard>
  )
} 