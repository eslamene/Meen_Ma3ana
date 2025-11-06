'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import type { CaseStatus } from '@/drizzle/schema'

interface StatusHistoryItem {
  id: string
  previousStatus: CaseStatus | null
  newStatus: CaseStatus
  changedBy: string | null
  systemTriggered: boolean
  changeReason: string | null
  changedAt: string
  changedByUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

interface StatusManagementPanelProps {
  caseId: string
  currentStatus: CaseStatus
  userRole: string
  onStatusChange: (newStatus: CaseStatus, reason: string) => Promise<void>
}

export default function StatusManagementPanel({
  caseId,
  currentStatus,
  onStatusChange
}: StatusManagementPanelProps) {
  const t = useTranslations('admin')
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | ''>('')
  const [changeReason, setChangeReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([])
  const [availableTransitions, setAvailableTransitions] = useState<CaseStatus[]>([])

  const fetchStatusHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/status`)
      if (response.ok) {
        const data = await response.json()
        setStatusHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching status history:', error)
    }
  }, [caseId])

  const fetchAvailableTransitions = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/transitions`)
      if (response.ok) {
        const data = await response.json()
        setAvailableTransitions(data.transitions || [])
      }
    } catch (error) {
      console.error('Error fetching available transitions:', error)
    }
  }, [caseId])

  useEffect(() => {
    fetchStatusHistory()
    fetchAvailableTransitions()
  }, [fetchStatusHistory, fetchAvailableTransitions])

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      setError('Please select a different status')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onStatusChange(selectedStatus, changeReason)
      
      // Reset form
      setSelectedStatus('')
      setChangeReason('')
      
      // Refresh data
      await fetchStatusHistory()
      await fetchAvailableTransitions()
    } catch {
      setError('Failed to change status')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: CaseStatus) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4" />
      case 'submitted':
        return <AlertTriangle className="h-4 w-4" />
      case 'published':
        return <CheckCircle className="h-4 w-4" />
      case 'closed':
        return <XCircle className="h-4 w-4" />
      case 'under_review':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      case 'under_review':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(currentStatus)}
            {t('currentStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStatusColor(currentStatus)}>
            {t(`status.${currentStatus}`)}
          </Badge>
        </CardContent>
      </Card>

      {/* Status Change Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('changeStatus')}</CardTitle>
          <CardDescription>
            {t('changeStatusDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('newStatus')} *
            </label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as CaseStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectNewStatus')} />
              </SelectTrigger>
              <SelectContent>
                {availableTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {t(`status.${status}`)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('changeReason')}
            </label>
            <Textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder={t('changeReasonPlaceholder')}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleStatusChange}
            disabled={isLoading || !selectedStatus || selectedStatus === currentStatus}
            className="w-full"
          >
            {isLoading ? t('changing') : t('changeStatus')}
          </Button>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('statusHistory')}</CardTitle>
          <CardDescription>
            {t('statusHistoryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusHistory.map((item) => (
              <div key={item.id} className="border-l-4 border-gray-200 pl-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.newStatus)}
                    <Badge className={getStatusColor(item.newStatus)}>
                      {t(`status.${item.newStatus}`)}
                    </Badge>
                    {item.previousStatus && (
                      <>
                        <span className="text-gray-400">→</span>
                        <Badge variant="outline">
                          {t(`status.${item.previousStatus}`)}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(item.changedAt)}
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {item.systemTriggered ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('systemTriggered')}
                    </span>
                  ) : item.changedByUser ? (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.changedByUser.firstName} {item.changedByUser.lastName}
                      ({item.changedByUser.email})
                    </span>
                  ) : (
                    <span className="text-gray-400">{t('unknownUser')}</span>
                  )}
                </div>

                {item.changeReason && (
                  <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {item.changeReason}
                  </div>
                )}
              </div>
            ))}

            {statusHistory.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                {t('noStatusHistory')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 