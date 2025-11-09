'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams as useNextParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity,
  AlertTriangle,
  ArrowLeft, 
  BarChart3,
  FileText,
  Gift,
  Globe,
  Heart, 
  Share2, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Clock,
  RefreshCw,
  Target,
  Tag,
  TrendingUp,
  Type,
  Users,
  Eye,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  Edit
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UpdatesTimeline from '@/components/cases/UpdatesTimeline'
import CaseFileManager, { CaseFile, FileCategory } from '@/components/cases/CaseFileManager'
import { realtimeCaseUpdates, CaseProgressUpdate } from '@/lib/realtime-case-updates'
import { CaseUpdate } from '@/lib/case-updates'

import { useApprovedContributions } from '@/lib/hooks/useApprovedContributions'
import { useAdmin } from '@/lib/admin/hooks'

interface Case {
  id: string
  title: string
  titleEn?: string
  titleAr?: string
  description: string
  descriptionEn?: string
  descriptionAr?: string
  target_amount: number
  current_amount: number
  status: string
  category: string
  type: 'one-time' | 'recurring'
  location: string
  created_at: string
  updated_at: string
  beneficiary_name: string
  beneficiary_contact: string
  priority: string
  duration?: number
  frequency?: string
  start_date?: string
  end_date?: string
  created_by: string
  supporting_documents?: string // JSON string of CaseFile[]
}

interface Contribution {
  id: string
  amount: number
  donorName: string
  message?: string
  createdAt: string
  anonymous: boolean
  status?: string
  approval_status?: {
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
    rejection_reason?: string
    admin_comment?: string
    donor_reply?: string
    donor_reply_date?: string
    payment_proof_url?: string
    resubmission_count: number
  }
}

export default function CaseDetailPage() {
  const t = useTranslations('cases')
  const params = useNextParams()
  const localeFromParams = params?.locale as string
  const localeFromHook = useLocale() as string
  // Use params first (more reliable), fallback to hook
  const locale = localeFromParams || localeFromHook || 'en'
  const isRTL = locale === 'ar'
  const router = useRouter()
  const caseId = params.id as string

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [updates, setUpdates] = useState<CaseUpdate[]>([])
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use centralized hook for approved contributions
  const { contributions: approvedContributions, totalAmount: approvedTotal } = useApprovedContributions(caseId)
  const { hasPermission } = useAdmin()
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'updates' | 'files'>('overview')
  const [realTimeProgress, setRealTimeProgress] = useState<CaseProgressUpdate | null>(null)
  const [canCreateUpdates, setCanCreateUpdates] = useState(false)
  const [totalContributions, setTotalContributions] = useState(0)

  // Helper functions to get locale-aware title and description
  // Simple logic: show the language that matches the locale
  // For English (locale === 'en'): use titleEn/descriptionEn
  // For Arabic (locale === 'ar'): use titleAr/descriptionAr
  const getDisplayTitle = useCallback((caseItem: Case | null): string => {
    if (!caseItem) return ''
    
    const titleEn = caseItem.titleEn?.trim() || null
    const titleAr = caseItem.titleAr?.trim() || null
    
    // Simple logic: show the language that matches the locale
    // If English locale and English content exists, show English. Otherwise fallback to Arabic.
    // If Arabic locale and Arabic content exists, show Arabic. Otherwise fallback to English.
    if (locale === 'ar') {
      return titleAr || titleEn || caseItem.title || 'Untitled Case'
    }
    return titleEn || titleAr || caseItem.title || 'Untitled Case'
  }, [locale])

  const getDisplayDescription = useCallback((caseItem: Case | null): string => {
    if (!caseItem) return ''
    
    const descriptionEn = caseItem.descriptionEn?.trim() || null
    const descriptionAr = caseItem.descriptionAr?.trim() || null
    
    // Simple logic: show the language that matches the locale
    if (locale === 'ar') {
      return descriptionAr || descriptionEn || caseItem.description || 'No description available'
    }
    return descriptionEn || descriptionAr || caseItem.description || 'No description available'
  }, [locale])

  // Memoized callback to prevent infinite loops
  const handleFilesChange = useCallback((updatedFiles: CaseFile[]) => {
    setCaseFiles(updatedFiles)
  }, [])

  const fetchCaseDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const client = createClient()
      const { data, error } = await client
        .from('cases')
        .select(`
          id,
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status,
          type,
          priority,
          location,
          beneficiary_name,
          beneficiary_contact,
          created_at,
          updated_at,
          created_by,
          assigned_to,
          sponsored_by,
          supporting_documents,
          category_id,
          case_categories(name)
        `)
        .eq('id', caseId)
        .single()

      if (error) {
        console.error('Error fetching case:', error)
        setError('Case not found')
        return
      }

      // Map database fields to include category name and use locale-aware fields
      const mappedData = {
        ...data,
        title: data.title_en || data.title_ar || '',
        titleEn: data.title_en,
        titleAr: data.title_ar,
        description: data.description_en || data.description_ar || '',
        descriptionEn: data.description_en,
        descriptionAr: data.description_ar,
        category: (data.case_categories && !Array.isArray(data.case_categories) 
          ? (data.case_categories as { name: string }).name 
          : null) || null,
        target_amount: parseFloat(data.target_amount || '0'),
        current_amount: parseFloat(data.current_amount || '0'),
      }
      
      setCaseData(mappedData as Case)
      
      // Fetch all files from unified case_files table
      const { data: filesData, error: filesError } = await client
        .from('case_files')
        .select('*')
        .eq('case_id', caseId)
        .order('display_order', { ascending: true })

      if (filesData && !filesError) {
        const files: CaseFile[] = filesData.map((file) => ({
          id: file.id,
          name: file.filename || file.original_filename || 'unnamed',
          originalName: file.filename || file.original_filename || 'unnamed',
          url: file.file_url,
          path: file.file_path,
          size: file.file_size || 0,
          type: file.file_type || 'application/octet-stream',
          category: file.category as FileCategory || 'other',
          description: file.description || '',
          isPublic: file.is_public || false,
          uploadedAt: file.created_at,
          uploadedBy: file.uploaded_by || data.created_by,
          metadata: {
            isPrimary: file.is_primary || false,
            displayOrder: file.display_order || 0
          }
        }))
        setCaseFiles(files)
      } else {
        setCaseFiles([])
      }
    } catch (error) {
      console.error('Error fetching case details:', error)
      setError('Failed to load case details')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  // Removed fetchContributions - contributions are now managed by useApprovedContributions hook
  // This prevents duplicate fetching and infinite loops

  const fetchTotalContributions = useCallback(async () => {
    try {
      const client = createClient()
      const { data, error } = await client
        .from('contributions')
        .select('amount')
        .eq('case_id', caseId)

      if (error) {
        console.error('Error fetching total contributions:', error)
        return
      }

      // Calculate total of ALL contributions (including pending/rejected)
      const total = (data || []).reduce((sum, contribution) => {
        return sum + parseFloat(contribution.amount || 0)
      }, 0)

      setTotalContributions(total)
    } catch (error) {
      console.error('Error calculating total contributions:', error)
    }
  }, [caseId])

  const fetchUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/updates`)
      if (response.ok) {
        const data = await response.json()
        setUpdates(data.updates || [])
      }
    } catch (error) {
      console.error('Error fetching updates:', error)
    }
  }, [caseId])

  const checkUserPermissions = useCallback(async () => {
    try {
      const client = createClient()
      const { data: { user } } = await client.auth.getUser()
      if (user && caseData) {
        // Check if user is admin or case creator
        const { data: userProfile } = await client
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userProfile?.role === 'admin' || caseData.created_by === user.id) {
          setCanCreateUpdates(true)
        }
      }
    } catch (error) {
      console.error('Error checking user permissions:', error)
    }
  }, [caseData])

  const setupRealtimeSubscriptions = useCallback(() => {
    // Subscribe to case progress updates
    realtimeCaseUpdates.subscribeToCaseProgress(
      caseId,
      (progressUpdate) => {
        setRealTimeProgress(progressUpdate)
        // Update case data with new progress
        setCaseData(prev => prev ? {
          ...prev,
          current_amount: progressUpdate.currentAmount,
          target_amount: progressUpdate.targetAmount
        } : null)
      },
      (error) => {
        console.error('Realtime progress error:', error)
      }
    )

    // Subscribe to case updates
    realtimeCaseUpdates.subscribeToCaseUpdates(
      caseId,
      (newUpdate) => {
        // Convert CaseUpdateNotification to CaseUpdate format
        const caseUpdate: CaseUpdate = {
          id: newUpdate.id,
          caseId: newUpdate.caseId,
          title: newUpdate.title,
          content: newUpdate.content,
          updateType: newUpdate.updateType,
          isPublic: true, // Assuming new updates are public
          attachments: [],
          createdBy: newUpdate.createdBy,
          created_at: new Date(newUpdate.createdAt),
          updated_at: new Date(newUpdate.createdAt),
          createdByUser: {
            first_name: newUpdate.createdByUser?.firstName,
            last_name: newUpdate.createdByUser?.lastName
          }
        }
        setUpdates(prev => [caseUpdate, ...prev])
      },
      (updatedUpdate) => {
        // Handle update modifications
        setUpdates(prev => prev.map(update => 
          update.id === updatedUpdate.id 
            ? {
                ...update,
                title: updatedUpdate.title,
                content: updatedUpdate.content,
                updateType: updatedUpdate.updateType,
                updated_at: new Date(updatedUpdate.createdAt)
              }
            : update
        ))
      },
      (deletedUpdateId) => {
        // Handle update deletions
        setUpdates(prev => prev.filter(update => update.id !== deletedUpdateId))
      }
    )

    // Subscribe to contributions
    realtimeCaseUpdates.subscribeToCaseContributions(
      caseId,
      (newContribution) => {
        // TODO: Handle real-time contribution updates if needed
        // Contributions are managed by useApprovedContributions hook
        console.log('New contribution received:', newContribution)
      }
    )
  }, [caseId])

  useEffect(() => {
    fetchCaseDetails()
    fetchUpdates()
    fetchTotalContributions()
    setupRealtimeSubscriptions()

    return () => {
      // Cleanup realtime subscriptions
      realtimeCaseUpdates.unsubscribeFromCaseProgress(caseId)
      realtimeCaseUpdates.unsubscribeFromCaseUpdates(caseId)
      realtimeCaseUpdates.unsubscribeFromCaseContributions(caseId)
    }
  }, [caseId, fetchCaseDetails, fetchUpdates, fetchTotalContributions, setupRealtimeSubscriptions])

  // Check permissions after caseData is loaded
  useEffect(() => {
    if (caseData) {
      checkUserPermissions()
    }
  }, [caseData, checkUserPermissions])

  const handleBack = () => {
    router.push(`/${locale}/cases`)
  }

  const handleFavorite = () => {
    setIsFavorite(!isFavorite)
    // TODO: Implement favorite functionality
  }

  const handleShare = async () => {
    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share({
          title: getDisplayTitle(caseData),
          text: getDisplayDescription(caseData),
          url: window.location.href
        })
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href)
        // TODO: Show toast notification
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = window.location.href
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        // TODO: Show toast notification
      }
    } catch (error) {
      // Handle share cancellation or errors gracefully
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error)
        // Fallback to clipboard
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(window.location.href)
          } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = window.location.href
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
          }
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError)
        }
      }
    }
  }

  const handleDonate = () => {
    router.push(`/${locale}/cases/${caseId}/donate`)
  }

  const handleUpdateCreated = (newUpdate: CaseUpdate) => {
    setUpdates(prev => [newUpdate, ...prev])
  }

  // Helper functions now use centralized hook data
  const getApprovedContributionsTotal = () => approvedTotal
  const getApprovedContributions = () => approvedContributions

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-orange-100 text-orange-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getFundingProgressStatus = (status: string, currentAmount: number, targetAmount: number) => {
    // If case is closed or completed, show completed status
    if (status === 'closed' || status === 'completed') {
      return {
        text: t('completed'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        dotColor: 'bg-green-500',
        animate: false
      }
    }
    
    // If target is reached, show completed
    if (currentAmount >= targetAmount) {
      return {
        text: t('completed'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        dotColor: 'bg-green-500',
        animate: false
      }
    }
    
    // Otherwise show in progress
    return {
      text: t('inProgress'),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      dotColor: 'bg-blue-500',
      animate: true
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return '🏥'
      case 'education': return '📚'
      case 'housing': return '🏠'
      case 'food': return '🍽️'
      case 'emergency': return '🚨'
      default: return '💝'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium': return <Target className="h-4 w-4 text-yellow-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('unknown')
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return t('unknown')
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return t('unknown')
    }
  }

  // Activity timeline item type
  type ActivityItem = {
    id: string
    title: string
    description: string
    date: string
    icon: React.ElementType
    bgColor: string
    borderColor: string
    dotColor: string
    iconColor: string
    extraInfo?: string
  }

  // Generate sorted activity timeline
  const generateSortedActivities = (): ActivityItem[] => {
    if (!caseData) return []
    const activities: ActivityItem[] = []
    
    // Case Published/Created
    if (caseData.status !== 'draft') {
      activities.push({
        id: 'case-published',
        title: t('casePublished'),
        description: 'Case was published and made available for contributions',
        date: caseData.created_at,
        icon: Globe,
        bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
        borderColor: 'border-green-100',
        dotColor: 'bg-green-500',
        iconColor: 'text-green-600'
      })
    } else {
      activities.push({
        id: 'case-draft',
        title: 'Case Created (Draft)',
        description: 'Case is in draft mode and not yet available for contributions',
        date: caseData.created_at,
        icon: Edit,
        bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-50',
        borderColor: 'border-yellow-100',
        dotColor: 'bg-yellow-500',
        iconColor: 'text-yellow-600'
      })
    }

    // First Contribution
    const approvedContributions = getApprovedContributions()
    if (approvedContributions.length > 0) {
      const firstContribution = approvedContributions[approvedContributions.length - 1]
      activities.push({
        id: 'first-contribution',
        title: t('firstContribution'),
        description: `First donation of EGP ${firstContribution.amount} by ${firstContribution.donorName}`,
        date: firstContribution.createdAt,
        icon: Heart,
        bgColor: 'bg-gradient-to-r from-blue-50 to-cyan-50',
        borderColor: 'border-blue-100',
        dotColor: 'bg-blue-500',
        iconColor: 'text-blue-600'
      })

      // Latest Contribution (if different from first)
      if (approvedContributions.length > 1) {
        const latestContribution = approvedContributions[0]
        activities.push({
          id: 'latest-contribution',
          title: 'Latest Contribution',
          description: `Latest donation of EGP ${latestContribution.amount} by ${latestContribution.donorName}`,
          date: latestContribution.createdAt,
          icon: Gift,
          bgColor: 'bg-gradient-to-r from-teal-50 to-green-50',
          borderColor: 'border-teal-100',
          dotColor: 'bg-teal-500',
          iconColor: 'text-teal-600'
        })
      }

      // Total Contributions Summary
      activities.push({
        id: 'total-contributions',
        title: 'Total Contributions',
        description: `${approvedContributions.length} people have contributed to this case`,
        date: approvedContributions[0].createdAt, // Use latest contribution date
        icon: Users,
        bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
        borderColor: 'border-amber-100',
        dotColor: 'bg-amber-500',
        iconColor: 'text-amber-600',
        extraInfo: `${approvedContributions.length} donors`
      })

      // Progress Milestone
      if (getApprovedContributionsTotal() > 0) {
        const progressPercentage = Math.round((getApprovedContributionsTotal() / Number(caseData.target_amount)) * 100)
        activities.push({
          id: 'progress-milestone',
          title: 'Progress Milestone',
          description: `${formatAmount(getApprovedContributionsTotal())} raised of ${formatAmount(caseData.target_amount)} goal`,
          date: approvedContributions[0].createdAt, // Use latest contribution date
          icon: TrendingUp,
          bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-50',
          borderColor: 'border-indigo-100',
          dotColor: 'bg-indigo-500',
          iconColor: 'text-indigo-600',
          extraInfo: `${progressPercentage}%`
        })
      }
    }

    // Case Completion/Final Status
    if (caseData.status === 'completed' || caseData.status === 'closed') {
      // Use updated_at as the completion date since it would be more recent than created_at
      const completionDate = caseData.updated_at || caseData.created_at
      const isCompleted = caseData.status === 'completed'
      
      activities.push({
        id: 'case-completion',
        title: isCompleted ? 'Case Completed' : 'Case Closed',
        description: isCompleted 
          ? 'Case has been successfully completed and reached its goal'
          : 'Case has been closed and is no longer accepting contributions',
        date: completionDate,
        icon: isCompleted ? CheckCircle : XCircle,
        bgColor: isCompleted 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50'
          : 'bg-gradient-to-r from-gray-50 to-slate-50',
        borderColor: isCompleted ? 'border-green-100' : 'border-gray-100',
        dotColor: isCompleted ? 'bg-green-500' : 'bg-gray-500',
        iconColor: isCompleted ? 'text-green-600' : 'text-gray-600'
      })
    }

    // Sort activities by date (most recent first)
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const formatRelativeDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('unknown')
    
    try {
    const date = new Date(dateString)
      if (isNaN(date.getTime())) return t('unknown')
      
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return t('justNow')
    if (diffInHours < 24) return t('hoursAgo', { hours: diffInHours })
    if (diffInHours < 48) return t('yesterday')
    return formatDate(dateString)
    } catch {
      return t('unknown')
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
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('errorLoadingCase')}</h2>
          <p className="text-gray-600 mb-4">{error || t('caseNotFound')}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToCases')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permissions={["cases:view"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to view this case.</p>
            <Button onClick={() => router.push(`/${locale}/cases`)}>
              Back to Cases
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToCases')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleFavorite}>
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Header */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <span className="text-3xl">{getCategoryIcon(caseData.category)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`${getStatusColor(caseData.status)} font-semibold px-3 py-1`}>
                          {caseData.status ? t(caseData.status) : t('notSpecified')}
                      </Badge>
                        <div className="flex items-center gap-1">
                      {getPriorityIcon(caseData.priority)}
                          <span className="text-sm text-gray-600 font-medium">
                            {caseData.priority ? t(caseData.priority) : t('notSpecified')} Priority
                          </span>
                    </div>
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-gray-800 mb-3 leading-tight" dir={isRTL ? 'rtl' : 'ltr'}>
                      {getDisplayTitle(caseData)}
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-700 leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
                      {getDisplayDescription(caseData)}
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
                    {(() => {
                      const progressStatus = getFundingProgressStatus(
                        caseData.status, 
                        approvedTotal, 
                        caseData.target_amount
                      )
                      return (
                        <div className={`px-3 py-1 ${progressStatus.bgColor} ${progressStatus.textColor} rounded-full text-sm font-medium flex items-center gap-1`}>
                          <div className={`w-2 h-2 ${progressStatus.dotColor} rounded-full ${progressStatus.animate ? 'animate-pulse' : ''}`}></div>
                          {progressStatus.text}
                        </div>
                      )
                    })()}
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
                          {Math.round((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100)}%
                        </div>
                        <div className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-medium">Target: {formatAmount(realTimeProgress?.targetAmount || caseData.target_amount)}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
                          style={{
                            width: `${Math.min((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100, 100)}%`
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

                  {/* Admin Disclaimer for Total Contributions */}
                  {hasPermission('contributions:read') && totalContributions !== approvedTotal && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-800 font-medium">
                          ⚠️ Total contributions: {formatAmount(totalContributions)} EGP (includes pending/rejected)
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 mt-1 ml-6">
                        Displayed amounts show only approved contributions. Total includes all contribution statuses.
                      </p>
                    </div>
                  )}
                                    
                  {/* Enhanced Progress Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {Math.round((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100)}%
                      </div>
                      <div className="text-sm text-green-700 font-medium">Complete</div>
                      <div className="w-8 h-1 bg-green-300 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {formatAmount(getApprovedContributionsTotal())}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">Raised</div>
                      <div className="w-8 h-1 bg-blue-300 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        {formatAmount(Number(realTimeProgress?.targetAmount || caseData.target_amount) - getApprovedContributionsTotal())}
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
                          {Math.round((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100) >= 75 
                            ? "Almost there! Just a little more to reach the goal." 
                            : Math.round((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100) >= 50
                            ? "Great progress! We're halfway to the goal."
                            : "Every contribution brings us closer to the goal."
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-white to-blue-50 shadow-lg overflow-hidden">
              <div className="w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'contributions' | 'updates' | 'files')}>
                <CardHeader className="pb-4">
                  <TabsList className="grid w-full grid-cols-4 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <TabsTrigger 
                      value="overview" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                      <Eye className="h-4 w-4" />
                      {t('overview')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="contributions" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                      <Users className="h-4 w-4" />
                      {t('contributions')}
                      {getApprovedContributions().length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs bg-white/20 text-white border-white/30">
                          {getApprovedContributions().length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="updates" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                        <Bell className="h-4 w-4" />
                        {t('updates')}
                        {updates.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs bg-white/20 text-white border-white/30">
                            {updates.length}
                          </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="files" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                        <FileText className="h-4 w-4" />
                        Files
                        {caseFiles.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs bg-white/20 text-white border-white/30">
                            {caseFiles.length}
                          </Badge>
                        )}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="overview" className="space-y-12">
                    {/* Case Details */}
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-12">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                          <FileText className="h-5 w-5 text-blue-600" />
                          {t('caseDetails')}
                        </h3>
                        <div className="space-y-4">
                          {/* Location */}
                          <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 font-medium">Location</span>
                            </div>
                            <span className="text-sm text-gray-900 font-semibold">
                              {caseData.location || t('locationNotSpecified')}
                            </span>
                          </div>
                          
                          {/* Beneficiary */}
                          <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 font-medium">Beneficiary</span>
                            </div>
                            <span className="text-sm text-gray-900 font-semibold">
                              {caseData.beneficiary_name || t('beneficiaryNotSpecified')}
                            </span>
                          </div>
                          
                          {/* Contact - Conditional */}
                          {caseData.beneficiary_contact && (
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                              <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 font-medium">Contact</span>
                              </div>
                              <span className="text-sm text-gray-900 font-semibold">{caseData.beneficiary_contact}</span>
                            </div>
                          )}
                          
                          {/* Created Date */}
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 font-medium">Created</span>
                            </div>
                            <span className="text-sm text-gray-900 font-semibold">
                              {formatDate(caseData.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recurring Details */}
                      {caseData.type === 'recurring' && (
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <h3 className="text-base font-semibold text-gray-800">{t('recurringDetails')}</h3>
                          </div>
                          <div className="space-y-4">
                            {/* Frequency */}
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 font-medium">Frequency</span>
                              </div>
                              <span className="text-sm text-gray-900 font-semibold">
                                {caseData.frequency ? t(caseData.frequency) : t('notSpecified')}
                              </span>
                            </div>
                            
                            {/* Duration */}
                            <div className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 font-medium">Duration</span>
                              </div>
                              <span className="text-sm text-gray-900 font-semibold">
                                {caseData.start_date && caseData.end_date 
                                  ? `${formatDate(caseData.start_date)} - ${formatDate(caseData.end_date)}`
                                  : t('notSpecified')
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="contributions" className="space-y-4">
                    {getApprovedContributions().length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">{t('noContributionsYet')}</p>
                        <p className="text-sm text-gray-400 mt-2">{t('beFirstToContribute')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getApprovedContributions().map((contribution) => (
                          <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {contribution.anonymous ? t('anonymousDonor') : contribution.donorName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatRelativeDate(contribution.createdAt)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">
                                {formatAmount(contribution.amount)}
                              </div>
                              {contribution.message && (
                                <div className="text-sm text-gray-500 mt-1">
                                  &ldquo;{contribution.message}&rdquo;
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Status: {contribution.status || 'unknown'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="updates">
                    <UpdatesTimeline 
                      caseId={caseId} 
                      updates={updates}
                      onUpdateCreated={handleUpdateCreated}
                      canCreate={canCreateUpdates}
                    />
                  </TabsContent>

                  <TabsContent value="files">
                    <CaseFileManager
                      caseId={caseId}
                      files={caseFiles}
                      canEdit={hasPermission('cases:update') || hasPermission('admin:cases')}
                      onFilesChange={handleFilesChange}
                      viewMode="grid"
                      showUpload={true}
                    />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Target className="h-5 w-5 text-blue-600" />
                  {t('takeAction')}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Support this cause and make a difference
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary Action - Donate */}
                <div className="relative">
                  <Button 
                    onClick={handleDonate} 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] justify-start px-6"
                  >
                    <Heart className="h-5 w-5 mr-3" />
                  {t('donateNow')}
                </Button>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>

                {/* Secondary Actions */}
                <div className="space-y-3 pt-2">
                  <Button 
                    variant="ghost" 
                    className="w-full h-11 text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group justify-start px-6"
                  >
                    <MessageCircle className="h-4 w-4 mr-3 text-gray-500 group-hover:text-blue-600 transition-colors" />
                    <span className="font-medium">{t('contactBeneficiary')}</span>
                </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={handleShare}
                    className="w-full h-11 text-gray-700 hover:text-green-600 hover:bg-green-50 border border-gray-200 hover:border-green-200 transition-all duration-200 group justify-start px-6"
                  >
                    <Share2 className="h-4 w-4 mr-3 text-gray-500 group-hover:text-green-600 transition-colors" />
                    <span className="font-medium">{t('shareCase')}</span>
                </Button>

                  {/* Admin Actions */}
                  {hasPermission('cases:update') && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-3 px-1 font-medium uppercase tracking-wide">{t('adminActions')}</p>
                      <Link href={`/${params.locale}/cases/${caseData.id}/edit`}>
                        <Button 
                          variant="ghost" 
                          className="w-full h-11 text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition-all duration-200 group justify-start px-6 bg-gradient-to-r from-amber-50 to-orange-50"
                        >
                          <Edit className="h-4 w-4 mr-3 text-amber-600 group-hover:text-amber-700 transition-colors" />
                          <span className="font-medium">{t('editCase')}</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Goal Progress</span>
                    <span className="font-semibold text-blue-600">
                      {Math.round((getApprovedContributionsTotal() / Number(caseData.target_amount)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((getApprovedContributionsTotal() / Number(caseData.target_amount)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Stats */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  {t('caseStats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('created')}</span>
                </div>
                    <span className="text-sm font-medium text-gray-800">{formatRelativeDate(caseData.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('category')}</span>
                </div>
                    <span className="text-sm font-medium text-gray-800">{caseData.category || t('notSpecified')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('priority')}</span>
                </div>
                    <span className="text-sm font-medium text-gray-800">{caseData.priority ? t(caseData.priority) : t('notSpecified')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('type')}</span>
                </div>
                    <span className="text-sm font-medium text-gray-800">{caseData.type ? t(caseData.type) : t('notSpecified')}</span>
                  </div>
                  
                {caseData.duration && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{t('duration')}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{caseData.duration} {t('days')}</span>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Activity className="h-5 w-5 text-orange-600" />
                  {t('recentActivity')}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Latest milestones and updates for this case
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generateSortedActivities().map((activity) => {
                    const IconComponent = activity.icon
                    return (
                      <div key={activity.id} className={`flex items-start gap-4 p-3 ${activity.bgColor} rounded-lg border ${activity.borderColor}`}>
                        <div className={`flex-shrink-0 w-3 h-3 ${activity.dotColor} rounded-full mt-1.5`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <IconComponent className={`h-4 w-4 ${activity.iconColor}`} />
                              <span className="font-medium text-gray-800">{activity.title}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {activity.extraInfo || formatRelativeDate(activity.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


      </div>
    </div>
    </PermissionGuard>
  )
} 