'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import ContributionsList from '@/components/contributions/ContributionsList'

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
    donor_reply_date?: string
    payment_proof_url?: string
    resubmission_count: number
    created_at: string
    updated_at: string
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

// Default filters - currently static but kept for potential future filter UI
const defaultFilters: Filters = {
  status: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  sortOrder: 'desc' // Default: newest first
}

export default function ContributionsPage() {
  const t = useTranslations('contributions')
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
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
  // Use default filters (static for now, can be converted to state when filter UI is added)
  const filters = defaultFilters
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null)

  // Handle tx parameter from URL (for notification redirects)
  useEffect(() => {
    const txId = searchParams.get('tx')
    if (txId) {
      setHighlightedTxId(txId)
      // Clear the parameter from URL after setting it
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('tx')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
  }, [searchParams, router])

  const fetchContributions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'created_at',
        sortOrder: filters.sortOrder // Use filter's sort order
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
    } catch (err) {
      logger.error('Error fetching contributions:', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to fetch contributions')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

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
          admin_comment: adminComment
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update contribution status')
      }

      // Refresh the contributions list
      await fetchContributions()
    } catch (error) {
      logger.error('Error updating contribution status:', { error: error })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <DetailPageHeader
          backUrl={`/${params.locale}/profile`}
          icon={Heart}
          title={t('title') || 'Contribution History'}
          description={t('description') || 'View and manage all your contributions'}
          backLabel="Back to Profile"
          badge={{
            label: `${pagination.total} ${pagination.total === 1 ? 'contribution' : 'contributions'}`,
            variant: 'secondary',
            className: 'bg-blue-100 text-blue-800 text-sm font-semibold'
          }}
        />

        {/* Unified Contributions List Component */}
        <ContributionsList
          contributions={contributions}
          loading={loading}
          onStatusUpdate={handleStatusUpdate}
          isAdmin={false}
          highlightedTxId={highlightedTxId || undefined}
          pagination={pagination}
          error={error}
          onPageChange={handlePageChange}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
} 