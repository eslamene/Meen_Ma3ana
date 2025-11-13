'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Heart, Clock, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import ContributionsList from '@/components/contributions/ContributionsList'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'

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
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
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
      const newUrl = `/${params.locale}/admin/contributions${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`
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

      toast({
        title: 'Success',
        description: `Contribution ${status} successfully`,
        type: 'success'
      })

      // Refresh the contributions list
      await fetchContributions()
    } catch (error) {
      console.error('Error updating contribution status:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        type: 'error'
      })
    }
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="contributions:manage">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
          <Container variant={containerVariant}>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${params.locale}/admin`)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Contribution Management</h1>
                  <p className="text-gray-600 mt-2">Review and manage all contributions</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                  {pagination.total} contributions
                </Badge>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-105 group ${
                  filters.status === 'all' 
                    ? 'border-2 border-blue-300 bg-blue-50/50' 
                    : 'hover:border-2 hover:border-blue-200'
                }`}
                onClick={() => handleFilterChange('status', 'all')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                      <Heart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-105 group ${
                  filters.status === 'pending' 
                    ? 'border-2 border-yellow-300 bg-yellow-50/50' 
                    : 'hover:border-2 hover:border-yellow-200'
                }`}
                onClick={() => handleFilterChange('status', 'pending')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition-colors">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-105 group ${
                  filters.status === 'approved' 
                    ? 'border-2 border-green-300 bg-green-50/50' 
                    : 'hover:border-2 hover:border-green-200'
                }`}
                onClick={() => handleFilterChange('status', 'approved')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:bg-white/95 hover:scale-105 group ${
                  filters.status === 'rejected' 
                    ? 'border-2 border-red-300 bg-red-50/50' 
                    : 'hover:border-2 hover:border-red-200'
                }`}
                onClick={() => handleFilterChange('status', 'rejected')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                      <XCircle className="h-6 w-6 text-red-600" />
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