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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  Edit,
  ExternalLink,
  Info,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UpdatesTimeline from '@/components/cases/UpdatesTimeline'
import CaseFileManager, { CaseFile, FileCategory } from '@/components/cases/CaseFileManager'
import { realtimeCaseUpdates, CaseProgressUpdate } from '@/lib/realtime-case-updates'
import { CaseUpdate } from '@/lib/case-updates'
import { Tooltip } from '@heroui/react'
import DynamicIcon from '@/components/ui/dynamic-icon'

import { useApprovedContributions } from '@/lib/hooks/useApprovedContributions'
import { useAdmin } from '@/lib/admin/hooks'
import { toast } from 'sonner'
import type { Beneficiary } from '@/types/beneficiary'

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
  categoryIcon?: string
  categoryColor?: string
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
  detectionRules?: string[] // Keywords from category detection rules
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
  const { contributions: approvedContributions, totalAmount: approvedTotal, isLoading: contributionsLoading, error: contributionsError } = useApprovedContributions(caseId)
  const [apiProgress, setApiProgress] = useState<{ approvedTotal: number; progressPercentage: number; contributorCount: number } | null>(null)
  const { hasPermission } = useAdmin()
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'files' | 'contributions' | 'updates'>('files')
  const [realTimeProgress, setRealTimeProgress] = useState<CaseProgressUpdate | null>(null)
  const [canCreateUpdates, setCanCreateUpdates] = useState(false)
  const [totalContributions, setTotalContributions] = useState(0)
  const [beneficiaryData, setBeneficiaryData] = useState<Beneficiary | null>(null)
  const [beneficiaryLoading, setBeneficiaryLoading] = useState(false)
  const [beneficiaryPopoverOpen, setBeneficiaryPopoverOpen] = useState(false)
  const [contributionsPage, setContributionsPage] = useState(1)
  const contributionsPerPage = 10
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)

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

      // Fetch case details from API
      const caseResponse = await fetch(`/api/cases/${caseId}`)
      
      if (!caseResponse.ok) {
        const errorData = await caseResponse.json().catch(() => ({}))
        const errorMessage = caseResponse.status === 404
          ? 'Case not found or you do not have permission to view it'
          : errorData.error || 'Failed to load case details'
        
        setError(errorMessage)
        toast.error('Error Loading Case', { description: errorMessage })
        return
      }

      const caseDataResponse = await caseResponse.json()
      const data = caseDataResponse.case

      // Map database fields to include category name, icon, color and use locale-aware fields
      const categoryData = data.case_categories && !Array.isArray(data.case_categories) 
        ? data.case_categories as { name: string; icon?: string; color?: string }
        : null
      
      const mappedData = {
        ...data,
        title: data.title_en || data.title_ar || '',
        titleEn: data.title_en,
        titleAr: data.title_ar,
        description: data.description_en || data.description_ar || '',
        descriptionEn: data.description_en,
        descriptionAr: data.description_ar,
        category: categoryData?.name || null,
        categoryIcon: categoryData?.icon || undefined,
        categoryColor: categoryData?.color || undefined,
        detectionRules: data.detectionRules || [],
        target_amount: parseFloat(data.target_amount || '0'),
        current_amount: parseFloat(data.current_amount || '0'),
      }
      
      setCaseData(mappedData as Case)
      
      // Fetch all files from API
      const filesResponse = await fetch(`/api/cases/${caseId}/files`)
      
      if (filesResponse.ok) {
        const filesDataResponse = await filesResponse.json()
        const filesData = filesDataResponse.files || []
        
        const files: CaseFile[] = filesData.map((file: any) => ({
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
      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error fetching case details:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      })
      setError('Failed to load case details')
      toast.error('Error Loading Case', { description: 'Failed to load case details. Please try refreshing the page.' })
    } finally {
      setLoading(false)
    }
  }, [caseId])

  // Removed fetchContributions - contributions are now managed by useApprovedContributions hook
  // This prevents duplicate fetching and infinite loops

  // Fetch progress from API as fallback for public users
  const fetchProgressFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/progress`)
      if (response.ok) {
        const data = await response.json()
        setApiProgress({
          approvedTotal: data.approvedTotal || 0,
          progressPercentage: data.progressPercentage || 0,
          contributorCount: data.contributorCount || 0
        })
      } else if (response.status === 404) {
        // Case not found - silently ignore (expected for draft cases or deleted cases)
        return
      }
      // Other errors are silently ignored to avoid console noise
    } catch (error) {
      // Network errors are silently ignored to avoid console noise
      // Only log unexpected errors in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Progress API fetch failed (expected for missing cases):', error)
      }
    }
  }, [caseId])

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

  const fetchBeneficiaryData = useCallback(async () => {
    if (!caseData?.beneficiary_name && !caseData?.beneficiary_contact) {
      return
    }

    try {
      setBeneficiaryLoading(true)
      
      // Try to find beneficiary by contact first, then by name
      let beneficiary: Beneficiary | null = null
      
      if (caseData.beneficiary_contact) {
        // Check both mobile_number and additional_mobile_number using API
        const findResponse = await fetch(`/api/beneficiaries/find?mobileNumber=${encodeURIComponent(caseData.beneficiary_contact)}`)
        const findResult = await findResponse.json()
        
        if (findResult.success && findResult.data) {
          beneficiary = findResult.data
        } else {
          // Try additional_mobile_number by searching
          const searchResponse = await fetch(`/api/beneficiaries/find?query=${encodeURIComponent(caseData.beneficiary_contact)}&limit=1`)
          const searchResult = await searchResponse.json()
          if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
            const found = searchResult.data[0]
            // Verify it matches the contact number
            if (found.additional_mobile_number === caseData.beneficiary_contact) {
              beneficiary = found
            }
          }
        }
      }
      
      // If not found by contact, try searching by name
      if (!beneficiary && caseData.beneficiary_name) {
        const searchResponse = await fetch(`/api/beneficiaries/find?query=${encodeURIComponent(caseData.beneficiary_name)}&limit=1`)
        const searchResult = await searchResponse.json()
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          beneficiary = searchResult.data[0]
        }
      }
      
      setBeneficiaryData(beneficiary)
    } catch (error) {
      console.error('Error fetching beneficiary data:', error)
      setBeneficiaryData(null)
    } finally {
      setBeneficiaryLoading(false)
    }
  }, [caseData?.beneficiary_name, caseData?.beneficiary_contact])

  // Fetch beneficiary data when popover opens
  useEffect(() => {
    if (beneficiaryPopoverOpen && !beneficiaryData && !beneficiaryLoading) {
      fetchBeneficiaryData()
    }
  }, [beneficiaryPopoverOpen, beneficiaryData, beneficiaryLoading, fetchBeneficiaryData])

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
    fetchProgressFromAPI() // Fetch progress from API as fallback
    setupRealtimeSubscriptions()

    return () => {
      // Cleanup realtime subscriptions
      realtimeCaseUpdates.unsubscribeFromCaseProgress(caseId)
      realtimeCaseUpdates.unsubscribeFromCaseUpdates(caseId)
      realtimeCaseUpdates.unsubscribeFromCaseContributions(caseId)
    }
  }, [caseId, fetchCaseDetails, fetchUpdates, fetchTotalContributions, fetchProgressFromAPI, setupRealtimeSubscriptions])

  // Use API progress as fallback if hook fails or returns 0
  useEffect(() => {
    if (contributionsError && apiProgress) {
      console.log('Using API progress as fallback due to hook error')
    }
  }, [contributionsError, apiProgress])

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

  // Helper functions now use centralized hook data, with API fallback
  const getApprovedContributionsTotal = () => {
    // Use API progress if hook failed (for public users who can't access contributions directly)
    if (contributionsError && apiProgress) {
      return apiProgress.approvedTotal
    }
    // If hook is still loading and we have API data, use it temporarily
    if (contributionsLoading && apiProgress) {
      return apiProgress.approvedTotal
    }
    return approvedTotal
  }
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
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="ghost" onClick={handleBack} className="text-sm sm:text-base">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('backToCases')}</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleFavorite} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Case Details Drawer - Premium Collapsible Component */}
        <div className="mb-4 sm:mb-6">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
            {/* Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            {/* Collapsed Header - Always Visible */}
            <button
              onClick={() => setDetailsDrawerOpen(!detailsDrawerOpen)}
              className="w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 group text-left"
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div 
                      className="p-2 sm:p-2.5 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-200 flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem]"
                      style={{
                        background: caseData.categoryColor 
                          ? ((): string => {
                              // Handle hex colors - convert to rgba with opacity for gradient
                              const color = caseData.categoryColor.startsWith('#') 
                                ? caseData.categoryColor 
                                : `#${caseData.categoryColor}`
                              // Create a gradient using the color with varying opacity
                              const r = parseInt(color.slice(1, 3), 16)
                              const g = parseInt(color.slice(3, 5), 16)
                              const b = parseInt(color.slice(5, 7), 16)
                              return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.9) 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)`
                            })()
                          : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      }}
                    >
                      <DynamicIcon 
                        name={caseData.categoryIcon || 'gift'} 
                        className="h-5 w-5 sm:h-6 sm:w-6 text-white" 
                        fallback="gift"
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Title and Description - Header Data */}
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 leading-tight break-words text-left" dir={isRTL ? 'rtl' : 'ltr'}>
                      {getDisplayTitle(caseData)}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words mb-3 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
                      {getDisplayDescription(caseData)}
                    </p>
                    
                    {/* Status and Priority - Below Header Data */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="secondary" className={`${getStatusColor(caseData.status)} font-semibold px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm`}>
                        {caseData.status ? t(caseData.status) : t('notSpecified')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(caseData.priority)}
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          <span className="hidden sm:inline">{caseData.priority ? t(caseData.priority) : t('notSpecified')} Priority</span>
                          <span className="sm:hidden">{caseData.priority ? t(caseData.priority) : t('notSpecified')}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Quick Info */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {caseData.location || t('locationNotSpecified')}
                        </span>
                  </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="truncate max-w-[100px] sm:max-w-none">
                          {caseData.beneficiary_name || t('beneficiaryNotSpecified')}
                        </span>
                </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{formatDate(caseData.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 font-medium"
                  >
                    <Info className="h-3 w-3" />
                    Details
                  </Badge>
                  <div className={`p-1.5 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-all duration-200 ${detailsDrawerOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded Content - Animated Drawer */}
            <div 
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                detailsDrawerOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4">
                  {/* Status Card */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                            {caseData.status ? t(caseData.status) : t('notSpecified')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Priority Card */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
                          {getPriorityIcon(caseData.priority)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                            {caseData.priority ? t(caseData.priority) : t('notSpecified')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Card */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                            {caseData.location || t('locationNotSpecified')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Beneficiary Card */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Beneficiary</p>
                          {caseData.beneficiary_name ? (
                            <Popover open={beneficiaryPopoverOpen} onOpenChange={setBeneficiaryPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 text-base sm:text-lg font-bold text-gray-900 hover:text-emerald-600 hover:bg-transparent mt-0.5 justify-start"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="truncate">{caseData.beneficiary_name}</span>
                                    <Info className="h-4 w-4 text-gray-400" />
                                  </div>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                {beneficiaryLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                                  </div>
                                ) : beneficiaryData ? (
                                  <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-semibold text-gray-900 text-base">{beneficiaryData.name}</h4>
                                        {beneficiaryData.name_ar && (
                                          <p className="text-sm text-gray-600 mt-0.5">{beneficiaryData.name_ar}</p>
                                        )}
                                      </div>
                                      {beneficiaryData.is_verified && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                      {beneficiaryData.age && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          <span className="text-gray-600">Age:</span>
                                          <span className="text-gray-900 font-medium">{beneficiaryData.age} years</span>
                                        </div>
                                      )}
                                      {beneficiaryData.mobile_number && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <Phone className="h-4 w-4 text-gray-400" />
                                          <span className="text-gray-600">Mobile:</span>
                                          <span className="text-gray-900 font-medium">{beneficiaryData.mobile_number}</span>
                                        </div>
                                      )}
                                      {beneficiaryData.city && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <MapPin className="h-4 w-4 text-gray-400" />
                                          <span className="text-gray-600">Location:</span>
                                          <span className="text-gray-900 font-medium">{beneficiaryData.city}</span>
                                        </div>
                                      )}
                                      {beneficiaryData.risk_level && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                                          <span className="text-gray-600">Risk Level:</span>
                                          <Badge 
                                            variant="outline" 
                                            className={
                                              beneficiaryData.risk_level === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                                              beneficiaryData.risk_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                              beneficiaryData.risk_level === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              'bg-red-50 text-red-700 border-red-200'
                                            }
                                          >
                                            {beneficiaryData.risk_level}
                                          </Badge>
                                        </div>
                                      )}
                                      {beneficiaryData.total_cases > 0 && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <FileText className="h-4 w-4 text-gray-400" />
                                          <span className="text-gray-600">Total Cases:</span>
                                          <span className="text-gray-900 font-medium">{beneficiaryData.total_cases}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="pt-2 border-t border-gray-100">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          setBeneficiaryPopoverOpen(false)
                                          router.push(`/${locale}/beneficiaries/${beneficiaryData.id}`)
                                        }}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Full Details
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <p className="text-sm text-gray-600">Beneficiary information not found in database</p>
                                    <p className="text-xs text-gray-500 mt-1">Only basic information is available</p>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                              {t('beneficiaryNotSpecified')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Card - Conditional */}
                  {caseData.beneficiary_contact && (
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full -mr-12 -mt-12"></div>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-md">
                            <Phone className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">{caseData.beneficiary_contact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created Date Card */}
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border border-purple-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                            {formatDate(caseData.created_at)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeDate(caseData.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recurring Details - Conditional */}
                  {caseData.type === 'recurring' && (
                    <>
                      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border border-cyan-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full -mr-12 -mt-12"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-md">
                              <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</p>
                              <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                                {caseData.frequency ? t(caseData.frequency) : t('notSpecified')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-200/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-200/30 to-purple-200/30 rounded-full -mr-12 -mt-12"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg shadow-md">
                              <RefreshCw className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</p>
                              <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                                {caseData.start_date && caseData.end_date 
                                  ? `${formatDate(caseData.start_date)} - ${formatDate(caseData.end_date)}`
                                  : t('notSpecified')
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Category Detection Rules Tags */}
                {caseData.detectionRules && caseData.detectionRules.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                        <Tag className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Category Keywords</h4>
                        <p className="text-xs text-gray-500">Related keywords for this category</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {caseData.detectionRules.map((keyword, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 transition-colors cursor-default"
                          style={{
                            borderColor: caseData.categoryColor 
                              ? `${caseData.categoryColor}40`
                              : undefined,
                            backgroundColor: caseData.categoryColor
                              ? (() => {
                                  const color = caseData.categoryColor.startsWith('#') 
                                    ? caseData.categoryColor 
                                    : `#${caseData.categoryColor}`
                                  const r = parseInt(color.slice(1, 3), 16)
                                  const g = parseInt(color.slice(3, 5), 16)
                                  const b = parseInt(color.slice(5, 7), 16)
                                  return `rgba(${r}, ${g}, ${b}, 0.1)`
                                })()
                              : undefined,
                            color: caseData.categoryColor || undefined
                          }}
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Modern Funding Progress Section */}
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50 shadow-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
              <CardHeader className="pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-bold text-gray-800 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg flex-shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg lg:text-xl font-bold truncate">Funding Progress</div>
                      <div className="text-xs sm:text-sm text-gray-500 font-normal truncate">Help us reach the goal</div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const progressStatus = getFundingProgressStatus(
                        caseData.status, 
                        approvedTotal, 
                        caseData.target_amount
                      )
                      const statusText = progressStatus.text
                      const isLongText = statusText.length > 10
                      const isCompleted = progressStatus.textColor.includes('green')
                      
                      return (
                        <Tooltip content={statusText} placement="top" delay={100} closeDelay={0}>
                          <div className={`px-2 sm:px-3 py-1 ${progressStatus.bgColor} ${progressStatus.textColor} rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 cursor-default`}>
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${progressStatus.dotColor} rounded-full ${progressStatus.animate ? 'animate-pulse' : ''}`}></div>
                            {isLongText ? (
                              isCompleted ? (
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              )
                            ) : (
                              <>
                                <span className="hidden min-[375px]:inline whitespace-nowrap">{statusText}</span>
                                {isCompleted ? (
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 min-[375px]:hidden" />
                                ) : (
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 min-[375px]:hidden" />
                                )}
                              </>
                            )}
                          </div>
                        </Tooltip>
                      )
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-6 sm:pb-8 px-4 sm:px-6">
                <div className="space-y-6">



                  {/* Enhanced Progress Bar with Integrated Target */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Progress Overview</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex items-center justify-between sm:flex-col sm:text-center p-2.5 sm:p-3 lg:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between w-full sm:flex-col sm:gap-0">
                        <div className="text-base sm:text-2xl lg:text-3xl font-bold text-green-600">
                          {Math.round((getApprovedContributionsTotal() / Number(realTimeProgress?.targetAmount || caseData.target_amount)) * 100)}%
                        </div>
                        <div className="text-xs sm:text-sm text-green-700 font-medium sm:mt-1">Complete</div>
                      </div>
                      <div className="hidden sm:block w-6 h-0.5 lg:w-8 lg:h-1 bg-green-300 rounded-full mx-auto mt-1.5 lg:mt-2"></div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:text-center p-2.5 sm:p-3 lg:p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between w-full sm:flex-col sm:gap-0">
                        <div className="text-base sm:text-2xl lg:text-3xl font-bold text-blue-600">
                          {formatAmount(getApprovedContributionsTotal())}
                        </div>
                        <div className="text-xs sm:text-sm text-blue-700 font-medium sm:mt-1">Raised</div>
                      </div>
                      <div className="hidden sm:block w-6 h-0.5 lg:w-8 lg:h-1 bg-blue-300 rounded-full mx-auto mt-1.5 lg:mt-2"></div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:text-center p-2.5 sm:p-3 lg:p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg sm:rounded-xl border border-orange-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between w-full sm:flex-col sm:gap-0">
                        <div className="text-base sm:text-2xl lg:text-3xl font-bold text-orange-600">
                          {formatAmount(Number(realTimeProgress?.targetAmount || caseData.target_amount) - getApprovedContributionsTotal())}
                        </div>
                        <div className="text-xs sm:text-sm text-orange-700 font-medium sm:mt-1">Still Needed</div>
                      </div>
                      <div className="hidden sm:block w-6 h-0.5 lg:w-8 lg:h-1 bg-orange-300 rounded-full mx-auto mt-1.5 lg:mt-2"></div>
                    </div>
                  </div>
                  {/* Progress Milestone */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base text-purple-800 mb-0.5 sm:mb-1">Progress Milestone</div>
                        <div className="text-xs sm:text-sm text-purple-600 leading-relaxed">
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
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => {
                  setActiveTab(value as 'files' | 'contributions' | 'updates')
                if (value === 'contributions') {
                  setContributionsPage(1)
                }
                }}
              >
                <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
                  <TabsList variant="branded" className="mb-0 sm:mb-0 p-1 sm:p-1.5">
                    <TabsTrigger 
                      value="files" 
                      variant="branded"
                      icon={FileText}
                      badge={caseFiles.length > 0 ? caseFiles.length : undefined}
                      tabIndex={0}
                    >
                      Files
                    </TabsTrigger>
                    <TabsTrigger 
                      value="contributions" 
                      variant="branded"
                      icon={Users}
                      badge={getApprovedContributions().length > 0 ? getApprovedContributions().length : undefined}
                      tabIndex={1}
                    >
                      {t('contributions')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="updates" 
                      variant="branded"
                      icon={Bell}
                      badge={updates.length > 0 ? updates.length : undefined}
                      tabIndex={2}
                    >
                      {t('updates')}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
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

                  <TabsContent value="contributions" className="space-y-4">
                    {getApprovedContributions().length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base text-gray-500">{t('noContributionsYet')}</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-2">{t('beFirstToContribute')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-[600px] overflow-y-auto space-y-2 sm:space-y-3 pr-2 -mr-2 sm:pr-0 sm:mr-0">
                          {(() => {
                            const contributions = getApprovedContributions()
                            const startIndex = (contributionsPage - 1) * contributionsPerPage
                            const endIndex = startIndex + contributionsPerPage
                            const paginatedContributions = contributions.slice(startIndex, endIndex)
                            
                            return paginatedContributions.map((contribution) => (
                              <div key={contribution.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                                      {contribution.anonymous ? t('anonymousDonor') : contribution.donorName}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-500">
                                      {formatRelativeDate(contribution.createdAt)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right gap-2 sm:gap-1">
                                  <div className="font-semibold text-sm sm:text-base text-green-600 whitespace-nowrap">
                                    {formatAmount(contribution.amount)}
                                  </div>
                                  {contribution.message && (
                                    <div className="text-xs sm:text-sm text-gray-500 line-clamp-2 sm:line-clamp-1 max-w-[200px] sm:max-w-none">
                                      &ldquo;{contribution.message}&rdquo;
                                    </div>
                                  )}
                                  <div className="text-[10px] sm:text-xs text-gray-400">
                                    <span className="hidden sm:inline">Status: </span>{contribution.status || 'unknown'}
                                  </div>
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                        {(() => {
                          const totalContributions = getApprovedContributions().length
                          const totalPages = Math.ceil(totalContributions / contributionsPerPage)
                          
                          if (totalPages <= 1) return null
                          
                          return (
                            <div className="flex items-center justify-between pt-2 sm:pt-4 border-t border-gray-200">
                              <div className="text-xs sm:text-sm text-gray-600">
                                Showing {((contributionsPage - 1) * contributionsPerPage) + 1} - {Math.min(contributionsPage * contributionsPerPage, totalContributions)} of {totalContributions}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setContributionsPage(prev => Math.max(1, prev - 1))}
                                  disabled={contributionsPage === 1}
                                  className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                                >
                                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  <span className="hidden sm:inline">Previous</span>
                                  <span className="sm:hidden">Prev</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setContributionsPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={contributionsPage === totalPages}
                                  className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                                >
                                  <span className="hidden sm:inline">Next</span>
                                  <span className="sm:hidden">Next</span>
                                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 ml-1 rotate-180" />
                                </Button>
                              </div>
                            </div>
                          )
                        })()}
                      </>
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
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Action Card */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  {t('takeAction')}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Support this cause and make a difference
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Primary Action - Donate */}
                <div className="relative">
                  <Button 
                    onClick={handleDonate} 
                    className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] justify-start px-4 sm:px-6"
                  >
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    {t('donateNow')}
                  </Button>
                  <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>

                {/* Secondary Actions */}
                <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 sm:h-11 text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group justify-start px-4 sm:px-6 text-sm sm:text-base"
                  >
                    <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500 group-hover:text-blue-600 transition-colors" />
                    <span className="font-medium">{t('contactBeneficiary')}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={handleShare}
                    className="w-full h-10 sm:h-11 text-gray-700 hover:text-green-600 hover:bg-green-50 border border-gray-200 hover:border-green-200 transition-all duration-200 group justify-start px-4 sm:px-6 text-sm sm:text-base"
                  >
                    <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500 group-hover:text-green-600 transition-colors" />
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
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  {t('caseStats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-600">{t('created')}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-right">{formatRelativeDate(caseData.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-600">{t('category')}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-right">{caseData.category || t('notSpecified')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-600">{t('priority')}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-right">{caseData.priority ? t(caseData.priority) : t('notSpecified')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-600">{t('type')}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-right">{caseData.type ? t(caseData.type) : t('notSpecified')}</span>
                  </div>
                  
                {caseData.duration && (
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs sm:text-sm text-gray-600">{t('duration')}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-800 text-right">{caseData.duration} {t('days')}</span>
                    </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  {t('recentActivity')}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Latest milestones and updates for this case
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="space-y-3 sm:space-y-4">
                  {generateSortedActivities().map((activity) => {
                    const IconComponent = activity.icon
                    return (
                      <div key={activity.id} className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 ${activity.bgColor} rounded-lg border ${activity.borderColor}`}>
                        <div className={`flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 ${activity.dotColor} rounded-full mt-1.5`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <IconComponent className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${activity.iconColor} flex-shrink-0`} />
                              <span className="font-medium text-xs sm:text-sm text-gray-800">{activity.title}</span>
                            </div>
                            <span className="text-xs text-gray-500 sm:ml-2">
                              {activity.extraInfo || formatRelativeDate(activity.date)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
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