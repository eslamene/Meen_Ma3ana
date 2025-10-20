'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, DollarSign, User, MapPin, Calendar, TrendingUp, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ContributionForm from '@/components/contributions/ContributionForm'
import ProgressBar from '@/components/cases/ProgressBar'
import { useApprovedContributions } from '@/lib/hooks/useApprovedContributions'

interface Case {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  status: string
  category: string
  priority?: string
  beneficiary_name: string
  location: string
  created_at: string
}

export default function DonatePage() {
  const t = useTranslations('cases')
  const safeT = (key: unknown, fallback?: string) => {
    try {
      return typeof key === 'string' ? t(key) : fallback ?? ''
    } catch {
      return fallback ?? ''
    }
  }
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const caseId = params.id as string

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  
  // Use centralized hook for approved contributions
  const { totalAmount: approvedTotal, isLoading: contributionsLoading, error: contributionsError, refetch: refetchContributions } = useApprovedContributions(caseId)

  useEffect(() => {
    fetchCaseDetails()
  }, [caseId])

  const fetchCaseDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (error) {
        console.error('Error fetching case:', error)
        setError('Case not found')
        return
      }

      if (data.status !== 'published') {
        setError('This case is not available for donations')
        return
      }

      setCaseData(data)
    } catch (error) {
      console.error('Error fetching case details:', error)
      setError('Failed to load case details')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/${locale}/cases/${caseId}`)
  }

  const handleContributionSubmitted = (contribution: { updatedCase?: { currentAmount: number } }) => {
    // Update case data with new progress
    if (caseData && contribution.updatedCase?.currentAmount) {
      setCaseData(prev => prev ? {
        ...prev,
        current_amount: contribution.updatedCase!.currentAmount
      } : null)
    }

    // Show success message and redirect after a delay
    setTimeout(() => {
      router.push(`/${locale}/cases/${caseId}`)
    }, 2000)
  }

  const handleCancel = () => {
    router.push(`/${locale}/cases/${caseId}`)
  }

  const getCategoryIcon = (category: string | null | undefined) => {
    switch (category) {
      case 'medical': return '🏥'
      case 'education': return '📚'
      case 'housing': return '🏠'
      case 'food': return '🍽️'
      case 'emergency': return '🚨'
      default: return '💝'
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700 border-green-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string | null | undefined) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-red-500 text-lg">🚨</span>
      case 'high':
        return <span className="text-orange-500 text-lg">⚠️</span>
      case 'medium':
        return <span className="text-yellow-500 text-lg">⚡</span>
      case 'low':
        return <span className="text-green-500 text-lg">📌</span>
      default:
        return <span className="text-gray-500 text-lg">📌</span>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('errorLoadingCase')}</h2>
          <p className="text-gray-600 mb-4">{error || t('caseNotFound')}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToCase')}
          </Button>
        </div>
      </div>
    )
  }

  // Ensure caseData exists before rendering
  if (!caseData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToCase')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Funding Progress Card - Matching Case Details Design */}
          <div className="space-y-6">
            {/* Case Header */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <span className="text-3xl">{getCategoryIcon(caseData.category || 'other')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`${getStatusColor(caseData.status || 'published')} font-semibold px-3 py-1`}>
                          {caseData.status && typeof caseData.status === 'string' && ['draft', 'published', 'completed', 'cancelled'].includes(caseData.status)
                            ? safeT(caseData.status, safeT('published'))
                            : safeT('published')}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(caseData.priority || 'medium')}
                          <span className="text-sm text-gray-600 font-medium">
                            {caseData.priority && typeof caseData.priority === 'string' && ['low', 'medium', 'high', 'urgent'].includes(caseData.priority)
                              ? safeT(caseData.priority, safeT('medium'))
                              : safeT('medium')} Priority
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-gray-800 mb-3 leading-tight">
                      {caseData.title}
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-700 leading-relaxed">
                      {caseData.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Modern Funding Progress Section */}
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50 shadow-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
              <CardHeader className="pb-6 pt-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">Funding Progress</div>
                      <div className="text-sm text-gray-500 font-normal">Help us reach the goal</div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      In Progress
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="space-y-6">
                  {/* Enhanced Progress Bar with Integrated Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700">Progress Overview</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                          {Math.round((approvedTotal / caseData.target_amount) * 100)}%
                        </div>
                        <div className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-medium">Target: {formatAmount(caseData.target_amount)}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
                          style={{
                            width: `${Math.min((approvedTotal / caseData.target_amount) * 100, 100)}%`
                          }}
                        >
                          {/* Animated shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                          {/* Floating particles */}
                          <div className="absolute top-1 left-1/4 w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                          <div className="absolute top-2 right-1/3 w-0.5 h-0.5 bg-white/80 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                          <div className="absolute bottom-1 left-1/2 w-0.5 h-0.5 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
                        </div>
                      </div>
                      {/* Progress markers */}
                      <div className="absolute -top-1 left-0 w-1 h-6 bg-green-500 rounded-full shadow-lg"></div>
                      <div className="absolute -top-1 right-0 w-1 h-6 bg-purple-500 rounded-full shadow-lg"></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Start
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Goal
                      </span>
                    </div>
                  </div>
                                    
                  {/* Enhanced Progress Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {Math.round((approvedTotal / caseData.target_amount) * 100)}%
                      </div>
                      <div className="text-sm text-green-700 font-medium">Complete</div>
                      <div className="w-8 h-1 bg-green-300 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {formatAmount(approvedTotal)}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">Raised</div>
                      <div className="w-8 h-1 bg-blue-300 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        {formatAmount(caseData.target_amount - approvedTotal)}
                      </div>
                      <div className="text-sm text-orange-700 font-medium">Still Needed</div>
                      <div className="w-8 h-1 bg-orange-300 rounded-full mx-auto mt-2"></div>
                    </div>
                  </div>
                  {/* Progress Milestone */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Target className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-purple-800">Progress Milestone</div>
                        <div className="text-sm text-purple-600">
                          {Math.round((approvedTotal / caseData.target_amount) * 100) >= 75 
                            ? "Almost there! Just a little more to reach the goal." 
                            : Math.round((approvedTotal / caseData.target_amount) * 100) >= 50
                            ? "Great progress! We're halfway there."
                            : "Every contribution helps! Let's work together to reach the goal."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donation Form */}
          <div>
            <ContributionForm
              caseId={caseId}
              caseTitle={caseData.title}
              targetAmount={caseData.target_amount}
              currentAmount={approvedTotal}
              onContributionSubmitted={handleContributionSubmitted}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 