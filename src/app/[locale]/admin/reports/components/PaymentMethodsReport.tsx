'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, CheckCircle, Clock, XCircle, Filter, TrendingUp } from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface PaymentMethodReport {
  methodId: string
  methodName: string
  methodCode: string
  totalAmount: string
  totalContributions: number
  averageAmount: string
  approvedAmount: string
  approvedContributions: number
  pendingAmount: string
  pendingContributions: number
  rejectedAmount: string
  rejectedContributions: number
  successRate: number
  isActive: boolean
}

export default function PaymentMethodsReport() {
  const t = useTranslations('admin.reports')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodReport[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('all')

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ dateRange })

      const response = await fetch(`/api/admin/reports/payment-methods?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods')
      }

      const data = await response.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      logger.error('Error fetching payment methods:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchPaymentMethods()
  }, [fetchPaymentMethods])

  const formatAmount = (amount: string) => {
    return `EGP ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
              <SelectItem value="last30Days">Last 30 Days</SelectItem>
              <SelectItem value="last90Days">Last 90 Days</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Payment Methods List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Payment Methods ({paymentMethods.length})</span>
            {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment methods...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payment methods found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.methodId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-indigo-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{method.methodName}</h3>
                          {method.isActive ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{method.methodCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatAmount(method.totalAmount)}</p>
                      <p className="text-xs text-gray-600">{method.totalContributions} contributions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-gray-600">Approved</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatAmount(method.approvedAmount)}</p>
                      <p className="text-xs text-gray-600">{method.approvedContributions} contributions</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                      <p className="font-semibold text-yellow-600">{formatAmount(method.pendingAmount)}</p>
                      <p className="text-xs text-gray-600">{method.pendingContributions} contributions</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <p className="text-xs text-gray-600">Rejected</p>
                      </div>
                      <p className="font-semibold text-red-600">{formatAmount(method.rejectedAmount)}</p>
                      <p className="text-xs text-gray-600">{method.rejectedContributions} contributions</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <p className="text-xs text-gray-600">Average</p>
                      </div>
                      <p className="font-semibold text-indigo-600">{formatAmount(method.averageAmount)}</p>
                      <p className="text-xs text-gray-600">Per contribution</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className={`font-semibold ${getSuccessRateColor(method.successRate)}`}>
                        {method.successRate}%
                      </span>
                    </div>
                    <Progress value={method.successRate} className="h-2" />
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

