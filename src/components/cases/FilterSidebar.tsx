'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Filter, 
  RefreshCw, 
  Target,
  AlertTriangle,
  GraduationCap,
  Home,
  Utensils,
  Gift,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  Eye,
  Users
} from 'lucide-react'
import { useTranslations } from 'next-intl'

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

interface FilterSidebarProps {
  filters: CaseFilters
  onFilterChange: (key: keyof CaseFilters, value: string) => void
  onClearFilters: () => void
  onApplyFilters: () => void
  isOpen: boolean
  onToggle: () => void
  activeFiltersCount: number
}

export default function FilterSidebar({
  filters,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
  isOpen,
  onToggle,
  activeFiltersCount
}: FilterSidebarProps) {
  const t = useTranslations('cases')

  const hasActiveFilters = activeFiltersCount > 0

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'education': return <GraduationCap className="h-4 w-4 text-blue-500" />
      case 'housing': return <Home className="h-4 w-4 text-green-500" />
      case 'appliances': return <Home className="h-4 w-4 text-orange-500" />
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'livelihood': return <DollarSign className="h-4 w-4 text-green-600" />
      case 'community': return <Users className="h-4 w-4 text-purple-600" />
      case 'basicneeds': return <Utensils className="h-4 w-4 text-orange-500" />
      case 'food': return <Utensils className="h-4 w-4 text-orange-500" />
      default: return <Gift className="h-4 w-4 text-purple-500" />
    }
  }

  return (
    <>
      {/* Enhanced Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="w-full flex items-center justify-between bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-blue-500 transition-all duration-200 h-12 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-1 bg-blue-100 rounded-lg">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">{t('filters')}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                {activeFiltersCount}
              </Badge>
            )}
            <div className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </Button>
      </div>

      {/* Enhanced Filter Sidebar */}
      <div className={`lg:block transition-all duration-300 ease-in-out ${isOpen ? 'block opacity-100' : 'hidden lg:block opacity-100'}`}>
        <Card className="mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">{t('filters')}</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('clearAll')}
                </Button>
              )}
            </div>
            <CardDescription className="text-gray-600 font-medium mt-2">
              {t('filterDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Enhanced Case Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                {t('caseType')}
              </label>
              <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 h-11">
                  <SelectValue placeholder={t('allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="one-time">{t('oneTime')}</SelectItem>
                  <SelectItem value="recurring">{t('recurring')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-600" />
                {t('status')}
              </label>
              <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 h-11">
                  <SelectValue placeholder={t('allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="published">{t('published')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="closed">{t('closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Gift className="h-4 w-4 text-purple-600" />
                {t('category')}
              </label>
              <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 h-11">
                  <SelectValue placeholder={t('allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories')}</SelectItem>
                  <SelectItem value="medical">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('medical')}
                      Medical Support
                    </div>
                  </SelectItem>
                  <SelectItem value="education">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('education')}
                      Educational Assistance
                    </div>
                  </SelectItem>
                  <SelectItem value="housing">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('housing')}
                      Housing & Rent
                    </div>
                  </SelectItem>
                  <SelectItem value="appliances">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('appliances')}
                      Home Appliances
                    </div>
                  </SelectItem>
                  <SelectItem value="emergency">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('emergency')}
                      Emergency Relief
                    </div>
                  </SelectItem>
                  <SelectItem value="livelihood">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('livelihood')}
                      Livelihood & Business
                    </div>
                  </SelectItem>
                  <SelectItem value="community">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('community')}
                      Community & Social
                    </div>
                  </SelectItem>
                  <SelectItem value="basicneeds">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('basicneeds')}
                      Basic Needs & Clothing
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon('other')}
                      Other Support
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Amount Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                {t('amountRange')}
              </label>
              <div className="space-y-3">
                <Input
                  placeholder={t('minAmount')}
                  value={filters.minAmount}
                  onChange={(e) => onFilterChange('minAmount', e.target.value)}
                  type="number"
                  className="border-2 border-gray-200 focus:border-blue-500 h-11"
                />
                <Input
                  placeholder={t('maxAmount')}
                  value={filters.maxAmount}
                  onChange={(e) => onFilterChange('maxAmount', e.target.value)}
                  type="number"
                  className="border-2 border-gray-200 focus:border-blue-500 h-11"
                />
              </div>
            </div>

            {/* Enhanced Sort Options */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                {t('sortBy')}
              </label>
              <Select value={filters.sortBy} onValueChange={(value) => onFilterChange('sortBy', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">{t('sortByDate')}</SelectItem>
                  <SelectItem value="amount">{t('sortByAmount')}</SelectItem>
                  <SelectItem value="priority">{t('sortByPriority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                {t('sortOrder')}
              </label>
              <Select value={filters.sortOrder} onValueChange={(value) => onFilterChange('sortOrder', value as 'asc' | 'desc')}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">{t('newestFirst')}</SelectItem>
                  <SelectItem value="asc">{t('oldestFirst')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced Quick Filter Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                {t('quickFilters')}
              </label>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-11 border-2 border-red-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                  onClick={() => {
                    onFilterChange('category', 'emergency')
                    onFilterChange('status', 'published')
                    onFilterChange('sortBy', 'createdAt')
                    onFilterChange('sortOrder', 'desc')
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                  {t('emergencyCases')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-11 border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                  onClick={() => {
                    onFilterChange('type', 'one-time')
                    onFilterChange('status', 'published')
                    onFilterChange('sortBy', 'amount')
                    onFilterChange('sortOrder', 'asc')
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  {t('lowAmountCases')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-11 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  onClick={() => {
                    onFilterChange('category', 'education')
                    onFilterChange('status', 'published')
                    onFilterChange('sortBy', 'createdAt')
                    onFilterChange('sortOrder', 'desc')
                  }}
                >
                  <GraduationCap className="h-4 w-4 mr-2 text-blue-500" />
                  {t('educationCases')}
                </Button>
              </div>
            </div>

            {/* Enhanced Apply Filters Button */}
            <Button 
              onClick={onApplyFilters} 
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 h-12"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('applyFilters')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 