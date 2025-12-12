'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bell, Check, CheckCheck, MessageSquare, TrendingUp, DollarSign, Target, XCircle, AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronRight, ExternalLink, Eye, Download, Search, Filter, X, ChevronLeft, ChevronRight as ChevronRightIcon, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { theme, brandColors } from '@/lib/theme'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { cn } from '@/lib/utils'
import Pagination from '@/components/ui/pagination'

interface Notification {
  id: string
  type: string
  title?: string // Legacy field
  message?: string // Legacy field
  title_en?: string
  title_ar?: string
  message_en?: string
  message_ar?: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
  recipient_id: string
}

export default function NotificationsPage() {
  const t = useTranslations('notifications')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { containerVariant } = useLayout()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set())
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofData, setProofData] = useState<{
    proofUrl?: string
    contributionId?: string
    amount?: number
    caseTitle?: string
  } | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [readStatusFilter, setReadStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')

  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (searchQuery) params.append('search', searchQuery)
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
      if (readStatusFilter && readStatusFilter !== 'all') params.append('read', readStatusFilter)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        console.error('Failed to fetch notifications')
        toast.error('Error', { description: t('failedToLoadNotifications') })
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Error', { description: 'Failed to load notifications' })
    } finally {
      setLoading(false)
    }
  }, [supabase, page, limit, searchQuery, typeFilter, readStatusFilter, sortBy, sortOrder, t])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, typeFilter, readStatusFilter, sortBy, sortOrder])

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.read) return

    try {
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notification.id,
          action: 'markAsRead'
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      // Mark as read completed
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead'
        })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId)
      } else {
        newSet.add(notificationId)
      }
      return newSet
    })
  }

  const handleViewTransactionDetails = (notification: Notification) => {
    const txId = (notification.data?.new_contribution_id as string) || (notification.data?.contribution_id as string)
    const parentId = notification.data?.original_contribution_id as string
    
    if (txId) {
      // Redirect to contribution details page
      router.push(`/${locale}/contributions/${txId}`)
    } else if (parentId) {
      // Redirect to parent contribution details page
      router.push(`/${locale}/contributions/${parentId}`)
    } else {
      // Redirect to general contributions page
      router.push(`/${locale}/contributions`)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'case_update':
        return <MessageSquare className="h-5 w-5" />
      case 'case_progress':
        return <TrendingUp className="h-5 w-5" />
      case 'case_contribution':
        return <DollarSign className="h-5 w-5" />
      case 'case_milestone':
        return <Target className="h-5 w-5" />
      case 'contribution_approved':
        return <Check className="h-5 w-5" />
      case 'contribution_rejected':
        return <XCircle className="h-5 w-5" />
      case 'contribution_pending':
        return <AlertTriangle className="h-5 w-5" />
      case 'contribution_revised':
        return <RefreshCw className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'case_update':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'case_progress':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'case_contribution':
        return 'bg-gradient-brand-subtle text-meen-800 border-meen-200'
      case 'case_milestone':
        return 'bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200'
      case 'contribution_approved':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'contribution_rejected':
        return 'bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200'
      case 'contribution_pending':
        return 'bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200'
      case 'contribution_revised':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTimeAgo = (dateString: string) => {
    // Parse the date string and ensure it's treated as UTC
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'))
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return t('justNow')
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t('daysAgo')}`
    
    return date.toLocaleDateString()
  }

  const truncateId = (id: string) => {
    return `${id.slice(0, 6)}...${id.slice(-6)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        toast.success(t('copied'), { description: t('transactionIdCopied') })
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          toast.success(t('copied'), { description: t('transactionIdCopied') })
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError)
          toast.error(t('copyFailed'), { description: t('unableToCopy') })
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Copy Failed', { description: 'Unable to copy to clipboard. Please copy manually.' })
    }
  }

  const handleViewProof = async (contributionId: string) => {
    try {
      const response = await fetch(`/api/contributions/${contributionId}`)
      if (response.ok) {
        const contribution = await response.json()
        if (contribution.proofUrl) {
          setProofData({
            proofUrl: contribution.proofUrl,
            contributionId: contribution.id,
            amount: contribution.amount,
            caseTitle: contribution.caseTitle
          })
          setShowProofModal(true)
        } else {
          toast.warning('No Proof Available', { description: 'This contribution does not have a payment proof attached.' })
        }
      } else {
        toast.error('Error', { description: 'Failed to fetch contribution details.' })
      }
    } catch (error) {
      console.error('Error fetching contribution:', error)
      toast.error('Error', { description: 'Failed to fetch contribution details.' })
    }
  }

  const notificationTypes = [
    { value: 'all', label: t('allTypes') },
    { value: 'contribution_approved', label: t('contributionApproved') },
    { value: 'contribution_rejected', label: t('contributionRejected') },
    { value: 'contribution_pending', label: t('contributionPending') },
    { value: 'contribution_revised', label: t('contributionRevised') },
    { value: 'case_update', label: t('caseUpdate') },
    { value: 'case_progress', label: t('caseProgress') },
    { value: 'case_contribution', label: t('caseContribution') },
    { value: 'case_milestone', label: t('caseMilestone') },
  ]

  const clearFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setReadStatusFilter('all')
    setSortBy('created_at')
    setSortOrder('desc')
    setPage(1)
  }

  const hasActiveFilters = searchQuery || (typeFilter && typeFilter !== 'all') || (readStatusFilter && readStatusFilter !== 'all') || sortBy !== 'created_at' || sortOrder !== 'desc'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <DetailPageHeader
          backUrl={`/${locale}/dashboard`}
          icon={Bell}
          title={t('title') || 'Notifications'}
          description={t('subtitle') || 'View and manage your notifications'}
          badge={unreadCount > 0 ? {
            label: `${unreadCount} ${t('unread')}`,
            variant: 'secondary',
            className: 'bg-amber-100 text-amber-700 border-amber-200'
          } : undefined}
          menuActions={unreadCount > 0 ? [
            {
              label: t('markAllAsRead'),
              onClick: handleMarkAllAsRead,
              icon: CheckCheck,
            },
          ] : undefined}
        />

        {/* Search and Filters */}
        <Card className="mb-6 border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-sm"
                />
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 text-sm">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t('filterByType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={readStatusFilter} onValueChange={setReadStatusFilter}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder={t('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="unread">{t('unreadOnly')}</SelectItem>
                    <SelectItem value="read">{t('readOnly')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder={t('sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('date')}</SelectItem>
                    <SelectItem value="type">{t('type')}</SelectItem>
                    <SelectItem value="read">{t('readStatus')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder={t('order')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t('newestFirst')}</SelectItem>
                    <SelectItem value="asc">{t('oldestFirst')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">{t('activeFilters')}:</span>
                  {searchQuery && (
                    <Badge variant="outline" className="text-xs">
                      {t('search')}: {searchQuery}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-1.5 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {typeFilter && typeFilter !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {t('type')}: {notificationTypes.find(t => t.value === typeFilter)?.label}
                      <button
                        onClick={() => setTypeFilter('all')}
                        className="ml-1.5 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {readStatusFilter && readStatusFilter !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {t('status')}: {readStatusFilter === 'read' ? t('read') : t('unread')}
                      <button
                        onClick={() => setReadStatusFilter('all')}
                        className="ml-1.5 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    {t('clearAll')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-indigo-600" />
              {t('notifications')}
              {total > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {total} {total === 1 ? t('notification') : t('notificationsCount')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">{t('loadingNotifications')}</p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {hasActiveFilters ? t('noNotificationsFound') : t('noNotificationsYet')}
                </h3>
                <p className="text-gray-500 text-sm">
                  {hasActiveFilters 
                    ? t('tryAdjustingFilters')
                    : t('notificationsWillAppear')}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    {t('clearFilters')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 sm:p-6">
                  {notifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id)
                const txId = (notification.data?.new_contribution_id as string) || (notification.data?.contribution_id as string)
                const parentId = notification.data?.original_contribution_id as string
                const amount = notification.data?.amount as number
                const caseTitle = notification.data?.case_title as string
                const rejectionReason = notification.data?.rejection_reason as string

                return (
                    <Card
                      key={notification.id}
                      className={cn(
                        "border transition-all hover:shadow-md",
                        !notification.read 
                          ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                          : "bg-white border-gray-200"
                      )}
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div
                          className="cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className={cn(
                              "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                              getNotificationColor(notification.type)
                            )}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                                  {locale === 'ar' 
                                    ? (notification.title_ar || notification.title || '')
                                    : (notification.title_en || notification.title || '')
                                  }
                                </h4>
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                {locale === 'ar'
                                  ? (notification.message_ar || notification.message || '')
                                  : (notification.message_en || notification.message || '')
                                }
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {(() => {
                              // Show transaction ids when available
                              if (txId || parentId) {
                                return (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    {txId && (
                                      <span className="font-mono">{t('tx')}: {truncateId(txId)}</span>
                                    )}
                                    {parentId && (
                                      <span className="font-mono">{t('parent')}: {truncateId(parentId)}</span>
                                    )}
                                    {(txId || parentId) && (
                                      <button
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          copyToClipboard(txId || parentId)
                                        }}
                                        aria-label={t('copyId')}
                                        title={t('copyTransactionId')}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            })()}
                                <span className="text-xs text-gray-500">{getTimeAgo(notification.created_at)}</span>
                                <Badge variant="outline" className={cn("text-xs", getNotificationColor(notification.type))}>
                                  {notificationTypes.find(nt => nt.value === notification.type)?.label || notification.type.replace(/_/g, ' ')}
                                </Badge>
                                {notification.type === 'contribution_pending' && (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                    {t('new')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpanded(notification.id)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                              aria-label={isExpanded ? t('hideDetails') : t('showDetails')}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                      
                      {/* Expandable Details Section */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-200 bg-gray-50/50">
                          <div className="pt-4 space-y-3">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">{t('details')}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {amount && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('amount')}:</span>
                                <span className="font-medium">{amount} EGP</span>
                              </div>
                            )}
                            {caseTitle && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('case')}:</span>
                                <span className="font-medium">{caseTitle}</span>
                              </div>
                            )}
                            {txId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('transactionId')}:</span>
                                <span className="font-mono text-xs">{truncateId(txId)}</span>
                              </div>
                            )}
                            {parentId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('parentTransaction')}:</span>
                                <span className="font-mono text-xs">{truncateId(parentId)}</span>
                              </div>
                            )}
                            {rejectionReason && (
                              <div className="flex justify-between col-span-full">
                                <span className="text-gray-600">{t('rejectionReason')}:</span>
                                <span className="font-medium text-red-600">{rejectionReason}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('created')}:</span>
                              <span className="font-medium">{new Date(notification.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('status')}:</span>
                              <span className={`font-medium ${
                                notification.read ? 'text-meen' : 'text-ma3ana'
                              }`}>
                                {notification.read ? t('read') : t('unread')}
                              </span>
                            </div>
                          </div>
                          
                            {/* Action Buttons */}
                            {(txId || parentId) && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewTransactionDetails(notification)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center justify-center gap-2 h-9"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    {t('viewDetails')}
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewProof(txId || parentId)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center justify-center gap-2 h-9 text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    {t('viewProof')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      total={total}
                      limit={limit}
                      onPageChange={setPage}
                      loading={loading}
                      showItemCount={true}
                      itemName="notifications"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Proof Modal */}
        {showProofModal && proofData && (
          <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t('paymentProof')}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto">
                {proofData.proofUrl && (
                  <div className="w-full h-full">
                    {proofData.proofUrl.toLowerCase().includes('.pdf') ? (
                      <iframe
                        src={proofData.proofUrl}
                        className="w-full h-[70vh] border-0"
                        title="Payment Proof"
                      />
                    ) : (
                      <Image
                        src={proofData.proofUrl}
                        alt="Payment Proof"
                        width={800}
                        height={600}
                        className="w-full h-auto max-h-[70vh] object-contain"
                        unoptimized
                      />
                    )}
                  </div>
                )}
              </div>
              {proofData.contributionId && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p><strong>{t('contributionId')}:</strong> {truncateId(proofData.contributionId)}</p>
                    {proofData.amount && <p><strong>{t('amount')}:</strong> {proofData.amount} EGP</p>}
                    {proofData.caseTitle && <p><strong>{t('case')}:</strong> {proofData.caseTitle}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(proofData.contributionId!)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      {t('copyId')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proofData.proofUrl, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      {t('download')}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </Container>
    </div>
  )
} 