'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Clock, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ContributionsList from '@/components/contributions/ContributionsList'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { theme, brandColors } from '@/lib/theme'

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
    sortOrder: 'desc' // Default: newest first
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

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

      const response = await fetch(`/api/contributions?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contributions')
      }

      setContributions(data.contributions || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPreviousPage ?? data.pagination.hasPrevPage ?? false
      }))
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 })
    } catch (err) {
      console.error('Error fetching contributions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contributions')
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
    } catch (error) {
      console.error('Error updating contribution status:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update status' })
    }
  }

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
            />
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 