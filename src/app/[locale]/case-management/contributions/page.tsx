'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Clock, CheckCircle, XCircle, Search, Filter, X, CheckSquare, Square, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ContributionsList from '@/components/contributions/ContributionsList'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { theme, brandColors } from '@/lib/theme'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { defaultLogger as logger } from '@/lib/logger'

interface Contribution {
  id: string
  caseId: string
  amount: number
  message?: string
  proofUrl?: string
  payment_method?: string
  status: 'pending' | 'approved' | 'rejected'
  anonymous: boolean
  createdAt: string
  caseTitle: string
  donorName: string
  donorId?: string
  donorEmail?: string
  donorFirstName?: string
  donorLastName?: string
  donorPhone?: string
  notes?: string
  approval_status?: Array<{
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
    rejection_reason?: string
    admin_comment?: string
    donor_reply?: string
    created_at: string
    updated_at: string
    resubmission_count: number
  }>
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface Filters {
  status: string
  search: string
  dateFrom: string
  dateTo: string
  sortOrder: 'asc' | 'desc'
  amountMin: string
  amountMax: string
  donorName: string
  paymentMethod: string
}

interface AdvancedFilters {
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  donorName: string
  paymentMethod: string
}

export default function AdminContributionsPage() {
  const t = useTranslations('admin.contributions')
  const tNav = useTranslations('navigation')
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { containerVariant } = useLayout()
  
  // Get status from URL query parameter
  const urlStatus = searchParams.get('status') || 'all'
  
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [filters, setFilters] = useState<Filters>({
    status: urlStatus, // Initialize from URL
    search: '',
    dateFrom: '',
    dateTo: '',
    sortOrder: 'desc', // Default: newest first
    amountMin: '',
    amountMax: '',
    donorName: '',
    paymentMethod: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'all' | 'viewed' | 'searched'>('none')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkActionProgress, setBulkActionProgress] = useState<{
    current: number
    total: number
    message: string
  } | null>(null)
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  
  // Calculate selection count (only pending items can be selected)
  const getSelectableCount = () => {
    // Count only pending items in current view
    return contributions.filter(c => c.status === 'pending').length
  }
  
  const getTotalSelectableCount = () => {
    // Total selectable items (only pending)
    if (filters.status === 'pending') {
      return stats.pending
    } else if (filters.status === 'all') {
      // When viewing all, only pending items are selectable
      return stats.pending
    } else {
      // For other statuses (approved, rejected), no items are selectable
      return 0
    }
  }
  
  const getSelectableCountInCurrentView = () => {
    // Count selectable items in current page view
    return contributions.filter(c => c.status !== 'approved').length
  }
  
  const getSelectionCount = () => {
    if (selectAllMode === 'all') {
      return getTotalSelectableCount()
    } else if (selectAllMode === 'searched') {
      // For searched mode, return the total matching filters (excluding approved)
      // The API will handle the actual filtering
      return getTotalSelectableCount()
    } else if (selectAllMode === 'viewed') {
      return getSelectableCountInCurrentView()
    } else {
      return selectedIds.size
    }
  }
  
  const getTotalCount = () => {
    if (selectAllMode === 'all') {
      return getTotalSelectableCount()
    } else if (selectAllMode === 'searched') {
      // For searched, show total matching current filters (excluding approved)
      return getTotalSelectableCount()
    } else {
      return getTotalSelectableCount()
    }
  }

  // Update filter when URL changes
  useEffect(() => {
    const statusFromUrl = searchParams.get('status') || 'all'
    setFilters(prev => ({ ...prev, status: statusFromUrl }))
  }, [searchParams])

  const fetchContributions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'created_at',
        sortOrder: filters.sortOrder, // Use filter's sort order
        admin: 'true' // This tells the API to show all contributions (admin view)
      })

      // Add filters
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo)
      }
      if (filters.amountMin) {
        params.append('amountMin', filters.amountMin)
      }
      if (filters.amountMax) {
        params.append('amountMax', filters.amountMax)
      }
      if (filters.donorName) {
        params.append('donorName', filters.donorName)
      }
      if (filters.paymentMethod) {
        params.append('paymentMethod', filters.paymentMethod)
      }

      const response = await fetch(`/api/contributions?${params.toString()}`)
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch contributions (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = `${errorMessage}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      setContributions(data.contributions || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 0,
        hasNextPage: data.pagination?.hasNextPage ?? false,
        hasPrevPage: data.pagination?.hasPreviousPage ?? data.pagination?.hasPrevPage ?? false
      }))
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err) || 'Failed to fetch contributions'
      const errorDetails = err instanceof Error ? {
        message: err.message,
        stack: err.stack,
        name: err.name
      } : { error: String(err) }
      
      logger.error('Error fetching contributions:', {
        error: errorMessage,
        details: errorDetails,
        filters,
        page: pagination.page,
        limit: pagination.limit
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Update URL when status filter changes
    if (key === 'status') {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        newSearchParams.delete('status')
      } else {
        newSearchParams.set('status', value)
      }
      const newUrl = `/${params.locale}/case-management/contributions${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`
      router.push(newUrl, { scroll: false })
    }
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleRefresh = () => {
    fetchContributions()
  }

  const handleStatusUpdate = async (contributionId: string, status: 'approved' | 'rejected', adminComment?: string) => {
    try {
      const response = await fetch(`/api/contributions/${contributionId}/approval-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejection_reason: status === 'rejected' ? adminComment : undefined,
          admin_comment: status === 'approved' ? adminComment : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
      }

      toast.success('Success', { description: `Contribution ${status} successfully` })

      // Refresh the contributions list
      await fetchContributions()
      // Remove from selection if it was selected
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(contributionId)
        return next
      })
    } catch (error) {
      logger.error('Error updating contribution status:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update status' })
    }
  }

  // Selection handlers - use virtual selection (no fetching)
  const handleSelectAll = (mode: 'all' | 'viewed' | 'searched') => {
    if (mode === 'viewed') {
      // Select all currently viewed items that are pending (actual IDs)
      const selectableIds = contributions
        .filter(c => c.status === 'pending')
        .map(c => c.id)
      const allIds = new Set(selectableIds)
      setSelectedIds(allIds)
      setSelectAllMode('viewed')
      if (allIds.size > 0) {
        toast.success(`Selected ${allIds.size} pending contribution(s) from current page`)
      } else {
        toast.info('No pending contributions to select on this page')
      }
    } else if (mode === 'searched') {
      // Virtual selection - mark as "all searched" without fetching
      // This will select all pending items matching current filters across ALL pages
      const selectableCount = getTotalSelectableCount()
      if (selectableCount === 0) {
        toast.info('No pending contributions found matching your filters')
        return
      }
      setSelectedIds(new Set()) // Clear individual selections
      setSelectAllMode('searched')
      toast.success(`Selected all ${selectableCount} pending contribution(s) matching your filters`)
    } else if (mode === 'all') {
      // Virtual selection - mark as "all" without fetching
      // This will select all pending items across ALL pages
      const selectableCount = getTotalSelectableCount()
      if (selectableCount === 0) {
        toast.info('No pending contributions found')
        return
      }
      setSelectedIds(new Set()) // Clear individual selections
      setSelectAllMode('all')
      toast.success(`Selected all ${selectableCount} pending contribution(s)`)
    }
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
    setSelectAllMode('none')
  }

  const handleToggleSelection = (id: string) => {
    // Check if this contribution is pending - only pending can be selected
    const contribution = contributions.find(c => c.id === id)
    if (contribution?.status !== 'pending') {
      toast.info('Only pending contributions can be selected for bulk actions')
      return
    }
    
    // If in virtual selection mode, switch to individual selection
    if (selectAllMode !== 'none' && selectAllMode !== 'viewed') {
      setSelectAllMode('none')
      setSelectedIds(new Set([id]))
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          // If no items selected, clear mode
          if (next.size === 0) {
            setSelectAllMode('none')
          }
        } else {
          next.add(id)
          // If selecting individual items, clear virtual mode
          if (selectAllMode !== 'viewed') {
            setSelectAllMode('none')
          }
        }
        return next
      })
    }
  }

  // Check if all selected items are pending
  const areAllSelectedPending = () => {
    if (selectAllMode === 'all') {
      // For "all" mode, we're selecting all pending items, so it's valid
      return getTotalSelectableCount() > 0
    } else if (selectAllMode === 'searched') {
      // For "searched" mode, we're selecting all pending items matching filters, so it's valid
      return getTotalSelectableCount() > 0
    } else if (selectAllMode === 'viewed') {
      // For "viewed" mode, check if all selected items are pending
      const selectedContributions = contributions.filter(c => selectedIds.has(c.id))
      return selectedContributions.length > 0 && selectedContributions.every(c => c.status === 'pending')
    } else {
      // For individual selection, check each selected item
      const selectedContributions = contributions.filter(c => selectedIds.has(c.id))
      return selectedContributions.length > 0 && selectedContributions.every(c => c.status === 'pending')
    }
  }

  // Bulk actions
  const handleBulkApprove = async () => {
    const selectionCount = getSelectionCount()
    if (selectionCount === 0) {
      toast.error('No items selected')
      return
    }

    // Validate that all selected items are pending
    if (!areAllSelectedPending()) {
      toast.error('Only pending contributions can be approved or rejected')
      return
    }

    try {
      setBulkActionLoading(true)
      
      // Prepare request body based on selection mode
      const requestBody: any = {
        action: 'approve'
      }
      
      if (selectAllMode === 'all') {
        // Select all - send mode instead of IDs (will filter to pending only)
        requestBody.selectMode = 'all'
      } else if (selectAllMode === 'searched') {
        // Select all searched - send mode and filters (ensure status is pending)
        requestBody.selectMode = 'searched'
        requestBody.filters = {
          status: 'pending', // Force pending status for bulk actions
          search: filters.search || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          amountMin: filters.amountMin || undefined,
          amountMax: filters.amountMax || undefined,
          donorName: filters.donorName || undefined,
          paymentMethod: filters.paymentMethod || undefined
        }
      } else {
        // Individual selection or 'viewed' mode - send IDs (API will validate they're pending)
        const idsArray = Array.from(selectedIds)
        if (idsArray.length === 0) {
          toast.error('No items selected')
          return
        }
        requestBody.ids = idsArray
      }

      // Log request for debugging
      logger.debug('Bulk approve request:', { 
        selectAllMode,
        selectedIdsCount: selectedIds.size,
        requestBody: JSON.stringify(requestBody, null, 2)
      })

      const response = await fetch('/api/admin/contributions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.errorCode || data.message || `Failed to approve contributions (${response.status})`
        logger.error('Bulk approve failed:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorMessage,
          errorCode: data.errorCode,
          details: data.details,
          requestBody: JSON.stringify(requestBody, null, 2),
          responseData: JSON.stringify(data, null, 2)
        })
        throw new Error(errorMessage)
      }

      setBulkActionProgress({
        current: data.success || 0,
        total: data.total || totalToProcess,
        message: `Completed: ${data.success || 0} approved, ${data.failed || 0} failed`
      })

      // Small delay to show completion message
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Success', { 
        description: `Approved ${data.success || 0} contribution(s)${data.failed > 0 ? `. ${data.failed} failed.` : ''} in ${(duration / 1000).toFixed(1)}s` 
      })

      // Refresh and clear selection
      await fetchContributions()
      setSelectedIds(new Set())
      setSelectAllMode('none')
      setBulkActionProgress(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve contributions'
      logger.error('Error bulk approving contributions:', { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      })
      toast.error('Error', { description: errorMessage })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkReject = async () => {
    const selectionCount = getSelectionCount()
    if (selectionCount === 0) {
      toast.error('No items selected')
      return
    }

    if (!bulkRejectReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    // Validate that all selected items are pending
    if (!areAllSelectedPending()) {
      toast.error('Only pending contributions can be approved or rejected')
      return
    }

    try {
      setBulkActionLoading(true)
      const totalToProcess = getSelectionCount()
      setBulkActionProgress({
        current: 0,
        total: totalToProcess,
        message: `Starting bulk reject for ${totalToProcess} contribution(s)...`
      })
      
      // Prepare request body based on selection mode
      const requestBody: any = {
        action: 'reject',
        reason: bulkRejectReason
      }
      
      if (selectAllMode === 'all') {
        // Select all - send mode instead of IDs (will filter to pending only)
        requestBody.selectMode = 'all'
      } else if (selectAllMode === 'searched') {
        // Select all searched - send mode and filters (ensure status is pending)
        requestBody.selectMode = 'searched'
        requestBody.filters = {
          status: 'pending', // Force pending status for bulk actions
          search: filters.search || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          amountMin: filters.amountMin || undefined,
          amountMax: filters.amountMax || undefined,
          donorName: filters.donorName || undefined,
          paymentMethod: filters.paymentMethod || undefined
        }
      } else {
        // Individual selection or 'viewed' mode - send IDs (API will validate they're pending)
        const idsArray = Array.from(selectedIds)
        if (idsArray.length === 0) {
          toast.error('No items selected')
          return
        }
        requestBody.ids = idsArray
      }

      const response = await fetch('/api/admin/contributions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Failed to reject contributions (${response.status})`
        logger.error('Bulk reject failed:', { 
          status: response.status, 
          error: errorMessage,
          requestBody 
        })
        throw new Error(errorMessage)
      }

      setBulkActionProgress({
        current: data.success || 0,
        total: data.total || totalToProcess,
        message: `Completed: ${data.success || 0} rejected, ${data.failed || 0} failed`
      })

      // Small delay to show completion message
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Success', { 
        description: `Rejected ${data.success || 0} contribution(s)${data.failed > 0 ? `. ${data.failed} failed.` : ''} in ${(duration / 1000).toFixed(1)}s` 
      })

      // Refresh and clear selection
      await fetchContributions()
      setSelectedIds(new Set())
      setSelectAllMode('none')
      setBulkRejectReason('')
      setShowBulkRejectDialog(false)
      setBulkActionProgress(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject contributions'
      logger.error('Error bulk rejecting contributions:', { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      })
      toast.error('Error', { description: errorMessage })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const clearAdvancedFilters = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      donorName: '',
      paymentMethod: ''
    }))
  }

  const hasAdvancedFilters = filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax || filters.donorName || filters.paymentMethod

  return (
    <ProtectedRoute>
      <PermissionGuard permission="contributions:manage">
        <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
          <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
            {/* Enhanced Header */}
            <DetailPageHeader
              backUrl={`/${params.locale}/case-management`}
              icon={Heart}
              title={t('title') || 'Contribution Management'}
              description={t('description') || 'Review and manage all contributions'}
              backLabel="Back to Dashboard"
              badge={{
                label: `${pagination.total} ${pagination.total === 1 ? 'contribution' : 'contributions'}`,
                variant: 'secondary',
                className: 'bg-blue-100 text-blue-800 text-sm font-semibold'
              }}
            />

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-[1.02] sm:hover:scale-105 group ${
                  filters.status === 'all' 
                    ? 'border-2 border-blue-300 bg-blue-50/50' 
                    : 'hover:border-2 hover:border-blue-200'
                }`}
                style={{ boxShadow: filters.status === 'all' ? theme.shadows.primary : theme.shadows.primary }}
                onClick={() => handleFilterChange('status', 'all')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-[1.02] sm:hover:scale-105 group ${
                  filters.status === 'pending' 
                    ? 'border-2 border-yellow-300 bg-yellow-50/50' 
                    : 'hover:border-2 hover:border-yellow-200'
                }`}
                style={{ boxShadow: filters.status === 'pending' ? theme.shadows.primary : theme.shadows.primary }}
                onClick={() => handleFilterChange('status', 'pending')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 bg-yellow-100 group-hover:bg-yellow-200 transition-colors">
                      <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-[1.02] sm:hover:scale-105 group ${
                  filters.status === 'approved' 
                    ? 'border-2 border-green-300 bg-green-50/50' 
                    : 'hover:border-2 hover:border-green-200'
                }`}
                style={{ boxShadow: filters.status === 'approved' ? theme.shadows.primary : theme.shadows.primary }}
                onClick={() => handleFilterChange('status', 'approved')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Approved</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.approved}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 bg-green-100 group-hover:bg-green-200 transition-colors">
                      <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-[1.02] sm:hover:scale-105 group ${
                  filters.status === 'rejected' 
                    ? 'border-2 border-red-300 bg-red-50/50' 
                    : 'hover:border-2 hover:border-red-200'
                }`}
                style={{ boxShadow: filters.status === 'rejected' ? theme.shadows.primary : theme.shadows.primary }}
                onClick={() => handleFilterChange('status', 'rejected')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Rejected</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.rejected}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 bg-red-100 group-hover:bg-red-200 transition-colors">
                      <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bulk Actions Toolbar */}
            {getSelectionCount() > 0 && (
              <Card className="mb-4 border border-white/20 bg-slate-900/80 backdrop-blur-md shadow-lg">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-white drop-shadow-sm">
                        {getSelectionCount()} of {getTotalCount()} contribution{getTotalCount() !== 1 ? 's' : ''} selected
                      </span>
                      {selectAllMode !== 'all' && selectAllMode !== 'searched' && getSelectionCount() < getTotalCount() && getTotalSelectableCount() > 0 && (
                        <button
                          onClick={() => {
                            if (hasAdvancedFilters || filters.status !== 'all' || filters.search) {
                              handleSelectAll('searched')
                            } else {
                              handleSelectAll('all')
                            }
                          }}
                          className="text-sm text-blue-300 hover:text-blue-200 underline font-medium transition-colors"
                        >
                          Select all {getTotalSelectableCount()} items
                        </button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="h-7 text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        disabled={bulkActionLoading}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkApprove}
                        disabled={bulkActionLoading || !areAllSelectedPending()}
                        className="bg-green-600/90 hover:bg-green-600 text-white font-medium shadow-md backdrop-blur-sm border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!areAllSelectedPending() ? 'Only pending contributions can be approved' : ''}
                      >
                        {bulkActionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {bulkActionProgress ? bulkActionProgress.message : 'Processing...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Selected
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkRejectDialog(true)}
                        disabled={bulkActionLoading || !areAllSelectedPending()}
                        className="bg-red-600/90 hover:bg-red-600 text-white font-medium shadow-md backdrop-blur-sm border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!areAllSelectedPending() ? 'Only pending contributions can be rejected' : ''}
                      >
                        {bulkActionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {bulkActionProgress ? `${bulkActionProgress.message}` : 'Processing...'}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Selected
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  {bulkActionProgress && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>{bulkActionProgress.message}</span>
                        <span>{bulkActionProgress.current} / {bulkActionProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: `${Math.min(100, (bulkActionProgress.current / bulkActionProgress.total) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search and Filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Basic Search */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by case title, donor name, or amount..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                          <Filter className="h-4 w-4 mr-2" />
                          Advanced Filters
                          {hasAdvancedFilters && (
                            <span className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {[filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax, filters.donorName, filters.paymentMethod].filter(Boolean).length}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 sm:w-96" align="end">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Advanced Filters</h4>
                            {hasAdvancedFilters && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAdvancedFilters}
                                className="h-7 text-xs"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                          
                          {/* Date Range */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Date Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">From</Label>
                                <Input
                                  type="date"
                                  value={filters.dateFrom}
                                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">To</Label>
                                <Input
                                  type="date"
                                  value={filters.dateTo}
                                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Amount Range */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Amount Range (EGP)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">Min</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={filters.amountMin}
                                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Max</Label>
                                <Input
                                  type="number"
                                  placeholder="∞"
                                  value={filters.amountMax}
                                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Donor Name */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Donor Name</Label>
                            <Input
                              placeholder="Search by donor name..."
                              value={filters.donorName}
                              onChange={(e) => handleFilterChange('donorName', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>

                          {/* Payment Method */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Payment Method</Label>
                            <Select
                              value={filters.paymentMethod || 'all'}
                              onValueChange={(value) => handleFilterChange('paymentMethod', value === 'all' ? '' : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All methods" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All methods</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Select All Viewed Option */}
                  {contributions.length > 0 && (
                    <div className="flex items-center gap-2 border-t pt-3">
                      <Checkbox
                        checked={
                          selectAllMode === 'viewed' ||
                          (selectAllMode === 'none' && selectedIds.size > 0 && selectedIds.size === getSelectableCount() && getSelectableCount() > 0)
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectAll('viewed')
                          } else {
                            handleDeselectAll()
                          }
                        }}
                      />
                      <Label 
                        className="text-sm font-medium cursor-pointer text-gray-900"
                        onClick={() => {
                          if (selectAllMode === 'viewed' || (selectedIds.size === getSelectableCount() && getSelectableCount() > 0)) {
                            handleDeselectAll()
                          } else {
                            handleSelectAll('viewed')
                          }
                        }}
                      >
                        Select All Viewed ({getSelectableCount()} pending)
                      </Label>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Unified Contributions List Component */}
            <ContributionsList
              contributions={contributions}
              loading={loading}
              onStatusUpdate={handleStatusUpdate}
              isAdmin={true}
              pagination={pagination}
              error={error}
              onPageChange={handlePageChange}
              onRefresh={handleRefresh}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              selectAllMode={selectAllMode}
            />

            {/* Bulk Reject Dialog */}
            {showBulkRejectDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle className="text-red-600">Reject Selected Contributions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Are you sure you want to reject {selectedIds.size} contribution(s)? This action cannot be undone.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="reject-reason" className="text-sm font-medium">
                        Rejection Reason <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="reject-reason"
                        placeholder="Enter reason for rejection..."
                        value={bulkRejectReason}
                        onChange={(e) => setBulkRejectReason(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <div className="flex items-center justify-end gap-2 p-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBulkRejectDialog(false)
                        setBulkRejectReason('')
                      }}
                      disabled={bulkActionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkReject}
                      disabled={bulkActionLoading || !bulkRejectReason.trim()}
                    >
                      {bulkActionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Reject'
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 