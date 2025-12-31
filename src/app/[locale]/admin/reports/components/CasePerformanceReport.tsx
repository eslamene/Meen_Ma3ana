'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, Eye, Filter, TrendingUp, Calendar } from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface CasePerformanceReport {
  caseId: string
  title: string
  category: string | null
  status: string
  targetAmount: string
  currentAmount: string
  progressPercentage: number
  totalContributions: number
  averageContribution: string
  firstContributionDate: string | null
  lastContributionDate: string | null
  daysActive: number | null
  completionRate: number
  createdBy: string | null
  createdAt: string
}

export default function CasePerformanceReport() {
  const t = useTranslations('admin.reports')
  const router = useRouter()
  const params = useParams()
  const [cases, setCases] = useState<CasePerformanceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('currentAmount')

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('sortBy', sortBy)
      params.append('sortOrder', 'desc')

      const response = await fetch(`/api/admin/reports/cases?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch cases')
      }

      const data = await response.json()
      setCases(data.cases || [])
    } catch (error) {
      logger.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sortBy])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const formatAmount = (amount: string) => {
    return `EGP ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      published: 'bg-blue-100 text-blue-800 border-blue-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return (
      <Badge variant="outline" className={statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {status}
      </Badge>
    )
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentAmount">Total Amount</SelectItem>
                <SelectItem value="totalContributions">Contributions Count</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Case Performance ({cases.length})</span>
            {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No cases found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((caseItem) => (
                <div key={caseItem.caseId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 truncate">{caseItem.title}</h3>
                        {getStatusBadge(caseItem.status)}
                        {caseItem.category && (
                          <Badge variant="outline" className="text-xs">
                            {caseItem.category}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Target</p>
                          <p className="font-semibold text-gray-900">{formatAmount(caseItem.targetAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-semibold text-green-600">{formatAmount(caseItem.currentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Contributions</p>
                          <p className="font-semibold text-gray-900">{caseItem.totalContributions}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Average</p>
                          <p className="font-semibold text-gray-900">{formatAmount(caseItem.averageContribution)}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${params.locale}/cases/${caseItem.caseId}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-900">{caseItem.progressPercentage}%</span>
                    </div>
                    <Progress value={caseItem.progressPercentage} className="h-2" />
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {caseItem.daysActive !== null && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{caseItem.daysActive} days active</span>
                        </div>
                      )}
                      {caseItem.firstContributionDate && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>First: {new Date(caseItem.firstContributionDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

