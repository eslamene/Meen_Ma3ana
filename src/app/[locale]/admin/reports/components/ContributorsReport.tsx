'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Download,
  User,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface ContributorReport {
  donorId: string
  donorName: string
  donorEmail: string
  donorPhone: string | null
  totalContributions: number
  totalAmount: string
  contributions: Array<{
    id: string
    amount: string
    status: string
    createdAt: string
    caseId: string | null
    caseTitle: string | null
    paymentMethod: string | null
    anonymous: boolean
    notes: string | null
  }>
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function ContributorsReport() {
  const t = useTranslations('admin.reports')
  const router = useRouter()
  const params = useParams()
  const [contributors, setContributors] = useState<ContributorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedContributors, setExpandedContributors] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  })

  const fetchContributors = useCallback(async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      })

      if (search) {
        queryParams.append('search', search)
      }
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter)
      }

      const response = await fetch(`/api/admin/reports/contributors?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch contributors')
      }

      const data = await response.json()
      setContributors(data.contributors || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      logger.error('Error fetching contributors:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, pagination.limit, pagination.offset])

  useEffect(() => {
    fetchContributors()
  }, [fetchContributors])

  const toggleContributor = (donorId: string) => {
    const newExpanded = new Set(expandedContributors)
    if (newExpanded.has(donorId)) {
      newExpanded.delete(donorId)
    } else {
      newExpanded.add(donorId)
    }
    setExpandedContributors(newExpanded)
  }

  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `EGP ${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 text-meen" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="w-full md:w-auto"
            >
              {t('clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contributors List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>{t('contributors')} ({pagination.total})</span>
            {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && contributors.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('loadingContributors')}</p>
            </div>
          ) : contributors.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('noContributors')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contributors.map((contributor) => {
                const isExpanded = expandedContributors.has(contributor.donorId)
                return (
                  <div
                    key={contributor.donorId}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleContributor(contributor.donorId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 rounded-full bg-indigo-100 flex-shrink-0">
                            <User className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {contributor.donorName}
                              {contributor.contributions.some((c) => c.anonymous) && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {t('someAnonymous')}
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">{contributor.donorEmail}</p>
                            {contributor.donorPhone && (
                              <p className="text-xs text-gray-500">{contributor.donorPhone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatAmount(contributor.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {contributor.totalContributions}{' '}
                              {contributor.totalContributions !== 1 ? t('contributions') : t('contribution')}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">{t('contributorDetails')}</h4>
                        <div className="space-y-3">
                          {contributor.contributions.map((contribution) => (
                            <div key={contribution.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <span className="font-semibold text-gray-900">
                                      {formatAmount(contribution.amount)}
                                    </span>
                                    {contribution.anonymous && (
                                      <Badge variant="outline" className="text-xs">
                                        {t('anonymous')}
                                      </Badge>
                                    )}
                                  </div>
                                  {contribution.caseTitle && (
                                    <p className="text-sm text-gray-700 mb-1">Case: {contribution.caseTitle}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(contribution.createdAt)}
                                    </div>
                                    {contribution.paymentMethod && (
                                      <span>
                                        {t('payment')}: {contribution.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                  {contribution.notes && (
                                    <p className="text-xs text-gray-600 mt-2 italic">
                                      {t('note')}: {contribution.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getStatusBadge(contribution.status)}
                                  {contribution.caseId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        router.push(`/${params.locale}/cases/${contribution.caseId}`)
                                      }
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      {t('viewCase')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t('showing')} {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)}{' '}
                {t('of')} {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
                  }}
                  disabled={pagination.offset === 0}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
                  }}
                  disabled={!pagination.hasMore}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

