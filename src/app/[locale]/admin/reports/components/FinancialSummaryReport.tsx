'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, CheckCircle, Clock, XCircle, Filter } from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface FinancialSummary {
  totalAmount: string
  totalContributions: number
  averageContribution: string
  approvedAmount: string
  approvedContributions: number
  pendingAmount: string
  pendingContributions: number
  rejectedAmount: string
  rejectedContributions: number
  paymentMethodBreakdown: Array<{
    methodName: string
    methodCode: string
    totalAmount: string
    totalContributions: number
    averageAmount: string
  }>
  dailyTrends: Array<{
    date: string
    amount: string
    count: number
  }>
  monthlyTrends: Array<{
    month: string
    amount: string
    count: number
  }>
}

export default function FinancialSummaryReport() {
  const t = useTranslations('admin.reports')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('last30Days')

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ dateRange })

      const response = await fetch(`/api/admin/reports/financial?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch financial summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      logger.error('Error fetching financial summary:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const formatAmount = (amount: string) => {
    return `EGP ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
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
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
              <SelectItem value="last30Days">Last 30 Days</SelectItem>
              <SelectItem value="last90Days">Last 90 Days</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial summary...</p>
        </div>
      ) : summary ? (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatAmount(summary.totalAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{summary.totalContributions} contributions</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{formatAmount(summary.approvedAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{summary.approvedContributions} contributions</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatAmount(summary.pendingAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{summary.pendingContributions} contributions</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average</p>
                    <p className="text-2xl font-bold text-indigo-600">{formatAmount(summary.averageContribution)}</p>
                    <p className="text-xs text-gray-500 mt-1">Per contribution</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.paymentMethodBreakdown.map((method) => (
                  <div key={method.methodCode} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{method.methodName}</p>
                      <p className="text-sm text-gray-600">{method.totalContributions} contributions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatAmount(method.totalAmount)}</p>
                      <p className="text-xs text-gray-600">Avg: {formatAmount(method.averageAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.monthlyTrends.slice(-12).map((trend) => (
                  <div key={trend.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-600">{trend.count} contributions</p>
                    </div>
                    <p className="font-semibold text-indigo-600">{formatAmount(trend.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No financial data available</p>
        </div>
      )}
    </div>
  )
}

