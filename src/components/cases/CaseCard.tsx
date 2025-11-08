'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Heart, 
  Calendar, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  Share2,
  Clock,
  User,
  AlertTriangle,
  GraduationCap,
  Home,
  Utensils,
  Gift,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams } from 'next/navigation'

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

interface CaseCardProps {
  caseItem: Case
  onViewDetails?: (caseId: string) => void
  onFavorite?: (caseId: string) => void
  isFavorite?: boolean
  viewMode?: 'grid' | 'list'
}

export default function CaseCard({ 
  caseItem, 
  onViewDetails, 
  onFavorite, 
  isFavorite = false,
  viewMode = 'grid'
}: CaseCardProps) {
  const t = useTranslations('cases')
  const params = useParams()
  const localeFromParams = params?.locale as string
  const localeFromHook = useLocale() as string
  // Use params first (more reliable), fallback to hook
  const locale = localeFromParams || localeFromHook || 'en'
  const [showDetails, setShowDetails] = useState(false)

  // Get the correct language content - SIMPLE and DIRECT
  // For English (locale === 'en'): use titleEn/descriptionEn
  // For Arabic (locale === 'ar'): use titleAr/descriptionAr
  const titleEn = caseItem.titleEn?.trim() || null
  const titleAr = caseItem.titleAr?.trim() || null
  const descriptionEn = caseItem.descriptionEn?.trim() || null
  const descriptionAr = caseItem.descriptionAr?.trim() || null

  // Simple logic: show the language that matches the locale
  // If English locale and English content exists, show English. Otherwise fallback to Arabic.
  // If Arabic locale and Arabic content exists, show Arabic. Otherwise fallback to English.
  const displayTitle = locale === 'ar' 
    ? (titleAr || titleEn || caseItem.title || 'Untitled Case')
    : (titleEn || titleAr || caseItem.title || 'Untitled Case')
  
  const displayDescription = locale === 'ar'
    ? (descriptionAr || descriptionEn || caseItem.description || 'No description available')
    : (descriptionEn || descriptionAr || caseItem.description || 'No description available')
  
  const titleDir = locale === 'ar' ? 'rtl' : 'ltr'
  const descriptionDir = locale === 'ar' ? 'rtl' : 'ltr'

  // Debug: Log first case only to avoid spam
  if (process.env.NODE_ENV === 'development' && caseItem.id === caseItem.id) {
    const debugKey = `casecard-debug-${caseItem.id}`
    if (!sessionStorage.getItem(debugKey)) {
      console.log('🔍 CaseCard Debug:', {
        caseId: caseItem.id,
        locale,
        localeFromParams,
        localeFromHook,
        hasTitleEn: !!titleEn,
        hasTitleAr: !!titleAr,
        titleEn: titleEn?.substring(0, 30),
        titleAr: titleAr?.substring(0, 30),
        displayTitle: displayTitle.substring(0, 50)
      })
      sessionStorage.setItem(debugKey, 'true')
    }
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200'
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'draft': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'education': return <GraduationCap className="h-4 w-4 text-blue-500" />
      case 'housing': return <Home className="h-4 w-4 text-green-500" />
      case 'food': return <Utensils className="h-4 w-4 text-orange-500" />
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Gift className="h-4 w-4 text-purple-500" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medical': return 'bg-red-50 border-red-200'
      case 'education': return 'bg-blue-50 border-blue-200'
      case 'housing': return 'bg-green-50 border-green-200'
      case 'food': return 'bg-orange-50 border-orange-200'
      case 'emergency': return 'bg-red-50 border-red-200'
      default: return 'bg-purple-50 border-purple-200'
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return t('justNow')
    if (diffInHours < 24) return t('hoursAgo', { hours: diffInHours })
    if (diffInHours < 48) return t('yesterday')
    return formatDate(dateString)
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onViewDetails) {
      onViewDetails(caseItem.id)
    }
  }

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(caseItem.id)
    }
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFavorite) {
      onFavorite(caseItem.id)
    }
  }

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDetails(!showDetails)
  }

  const progressPercentage = getProgressPercentage(caseItem.currentAmount, caseItem.targetAmount)
  const isNearTarget = progressPercentage >= 75
  const isFullyFunded = progressPercentage >= 100

  // Grid View Component
  const GridView = () => (
    <Card 
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:scale-[1.02] overflow-hidden" 
      onClick={handleCardClick}
    >
      {/* Header with Status and Category */}
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`${getStatusColor(caseItem.status)} font-medium text-xs`}>
              {t(caseItem.status)}
            </Badge>
            {caseItem.priority && (
              <Badge variant="outline" className={`${getPriorityColor(caseItem.priority)} font-medium text-xs`}>
                {t(caseItem.priority)}
              </Badge>
            )}
          </div>
          <div className={`p-2 rounded-lg ${getCategoryColor(caseItem.category)} flex-shrink-0`}>
            {getCategoryIcon(caseItem.category)}
          </div>
        </div>
        
        <CardTitle className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors" dir={titleDir}>
          {displayTitle}
        </CardTitle>
        <div className="text-gray-600 text-sm leading-relaxed line-clamp-3" dir={descriptionDir}>
          {displayDescription}
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Compact Progress Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">{t('fundingProgress')}</span>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">
                {formatAmount(caseItem.currentAmount)}
              </div>
              <div className="text-xs text-gray-500">{t('raised')}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative mb-2">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  isFullyFunded 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : isNearTarget 
                    ? 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'
                    : 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{progressPercentage.toFixed(1)}% {t('funded')}</span>
            <span className="text-gray-500">{formatAmount(caseItem.targetAmount)} {t('target')}</span>
          </div>
          
          {/* Progress Status */}
          {isFullyFunded && (
            <div className="mt-1 flex items-center gap-1 text-green-600 text-xs font-medium">
              <TrendingUp className="h-3 w-3" />
              {t('fullyFunded')}
            </div>
          )}
          {isNearTarget && !isFullyFunded && (
            <div className="mt-1 flex items-center gap-1 text-orange-600 text-xs font-medium">
              <Clock className="h-3 w-3" />
              {t('nearTarget')}
            </div>
          )}
        </div>

        {/* Collapsible Details */}
        <div className="flex-1">
          {/* Always visible key info */}
          <div className="space-y-2 text-xs text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{caseItem.location || t('locationNotSpecified')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>{getTimeAgo(caseItem.createdAt)}</span>
            </div>
          </div>

          {/* Collapsible extra details */}
          {showDetails && (
            <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span>{t('targetAmount')}: {formatAmount(caseItem.targetAmount)}</span>
              </div>
              {caseItem.beneficiaryName && (
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{caseItem.beneficiaryName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Gift className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span>{t(caseItem.type)}</span>
              </div>
            </div>
          )}

          {/* Toggle Details Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleDetails}
            className="w-full mt-2 h-6 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                {t('showLess')}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {t('showMore')}
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-xs py-2"
            onClick={handleViewDetails}
          >
            <Eye className="h-3 w-3 mr-1" />
            {t('viewDetails')}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleFavorite}
            className={`border hover:border-red-500 transition-all duration-200 py-2 px-2 ${
              isFavorite 
                ? 'text-red-500 border-red-500 bg-red-50' 
                : 'border-gray-200 hover:bg-red-50'
            }`}
          >
            <Heart className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            className="border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 py-2 px-2"
          >
            <Share2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // List View Component
  const ListView = () => (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/90 backdrop-blur-sm border-0 shadow-md hover:scale-[1.01] overflow-hidden" 
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Category Icon */}
          <div className={`p-3 rounded-lg ${getCategoryColor(caseItem.category)} flex-shrink-0`}>
            {getCategoryIcon(caseItem.category)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`${getStatusColor(caseItem.status)} font-medium text-xs`}>
                    {t(caseItem.status)}
                  </Badge>
                  {caseItem.priority && (
                    <Badge variant="outline" className={`${getPriorityColor(caseItem.priority)} font-medium text-xs`}>
                      {t(caseItem.priority)}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate" dir={titleDir}>
                  {displayTitle}
                </CardTitle>
                <div className="text-sm text-gray-600 line-clamp-2 mt-1" dir={descriptionDir}>
                  {displayDescription}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">{t('fundingProgress')}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{formatAmount(caseItem.currentAmount)}</span>
                    <span className="text-xs text-gray-500 ml-1">{t('raised')}</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isFullyFunded 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : isNearTarget 
                          ? 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'
                          : 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-gray-600">{progressPercentage.toFixed(1)}% {t('funded')}</span>
                  <span className="text-gray-500">{formatAmount(caseItem.targetAmount)} {t('target')}</span>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="truncate">{caseItem.location || t('locationNotSpecified')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span>{getTimeAgo(caseItem.createdAt)}</span>
              </div>
              {isFullyFunded && (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  {t('fullyFunded')}
                </div>
              )}
              {isNearTarget && !isFullyFunded && (
                <div className="flex items-center gap-1 text-orange-600 font-medium">
                  <Clock className="h-3 w-3" />
                  {t('nearTarget')}
                </div>
              )}
            </div>

            {/* Collapsible Extra Details */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-gray-400" />
                    <span>{t('targetAmount')}: {formatAmount(caseItem.targetAmount)}</span>
                  </div>
                  {caseItem.beneficiaryName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="truncate">{caseItem.beneficiaryName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Gift className="h-3 w-3 text-gray-400" />
                    <span>{t(caseItem.type)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-xs px-3"
              onClick={handleViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              {t('viewDetails')}
            </Button>
            
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleFavorite}
                className={`border hover:border-red-500 transition-all duration-200 p-1 ${
                  isFavorite 
                    ? 'text-red-500 border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:bg-red-50'
                }`}
              >
                <Heart className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                className="border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 p-1"
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Toggle Details Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleDetails}
              className="h-6 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 p-1"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return viewMode === 'list' ? <ListView /> : <GridView />
} 