'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  useSyncExternalStore,
} from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Bell, Check, CheckCheck, MessageSquare, TrendingUp, DollarSign, Target, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink, Eye, Download, Search, Filter, X, FolderKanban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

import { defaultLogger as logger } from '@/lib/logger'

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

function notificationTitle(n: Notification, locale: string) {
  return locale === 'ar'
    ? (n.title_ar || n.title || '')
    : (n.title_en || n.title || '')
}

function notificationMessage(n: Notification, locale: string) {
  return locale === 'ar'
    ? (n.message_ar || n.message || '')
    : (n.message_en || n.message || '')
}

const LIST_SUMMARY_SEP = ' · '

function truncateListText(s: string, max: number): string {
  const trimmed = s.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`
}

function strFromData(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  return String(v).trim()
}

function numFromData(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function formatListEgp(amount: number, locale: string): string {
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US'
  return `${amount.toLocaleString(loc)} EGP`
}

/** Extra line under the title in the list: structured fields from `data`, else message excerpt. */
function notificationListSecondary(
  n: Notification,
  locale: string,
  t: (key: string) => string,
  truncateId: (id: string) => string
): string | null {
  const d = (n.data || {}) as Record<string, unknown>
  const parts: string[] = []
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US'

  const pushAmt = (v: unknown) => {
    const a = numFromData(v)
    if (a != null) parts.push(formatListEgp(a, locale))
  }

  switch (n.type) {
    case 'contribution_approved':
    case 'contribution_rejected':
    case 'contribution_pending': {
      pushAmt(d.amount)
      const caseTitle = strFromData(d.case_title)
      if (caseTitle) parts.push(truncateListText(caseTitle, 48))
      const tx =
        strFromData(d.new_contribution_id) || strFromData(d.contribution_id)
      if (tx) parts.push(`${t('tx')} ${truncateId(tx)}`)
      const parent = strFromData(d.original_contribution_id)
      if (!tx && parent) parts.push(`${t('parent')} ${truncateId(parent)}`)
      if (n.type === 'contribution_rejected') {
        const reason = strFromData(d.rejection_reason)
        if (reason) parts.push(truncateListText(reason, 44))
      }
      break
    }
    case 'contribution_revised': {
      const newAmt = numFromData(d.new_amount)
      const oldAmt = numFromData(d.original_amount)
      if (oldAmt != null && newAmt != null && oldAmt !== newAmt) {
        parts.push(
          `${oldAmt.toLocaleString(loc)} → ${newAmt.toLocaleString(loc)} EGP`
        )
      } else {
        if (newAmt != null) pushAmt(newAmt)
        else if (oldAmt != null) pushAmt(oldAmt)
      }
      const newId = strFromData(d.new_contribution_id)
      const origId = strFromData(d.original_contribution_id)
      if (newId) parts.push(`${t('tx')} ${truncateId(newId)}`)
      if (origId) parts.push(`${t('parent')} ${truncateId(origId)}`)
      const caseId = strFromData(d.case_id)
      if (caseId) parts.push(`${t('case')} ${truncateId(caseId)}`)
      const expl = strFromData(d.revision_explanation)
      if (expl) parts.push(truncateListText(expl, 52))
      break
    }
    case 'case_contribution': {
      const donor =
        strFromData(d.donorName) || strFromData(d.donor_name)
      if (donor) parts.push(truncateListText(donor, 36))
      pushAmt(d.amount)
      const caseTitle =
        strFromData(d.case_title) || strFromData(d.caseTitle)
      const caseId = strFromData(d.caseId) || strFromData(d.case_id)
      if (caseTitle) parts.push(truncateListText(caseTitle, 40))
      else if (caseId) parts.push(`${t('case')} ${truncateId(caseId)}`)
      const contr =
        strFromData(d.contributionId) || strFromData(d.contribution_id)
      if (contr) parts.push(`${t('tx')} ${truncateId(contr)}`)
      break
    }
    case 'case_progress':
    case 'case_milestone': {
      const milestone = strFromData(d.milestone)
      if (milestone) parts.push(milestone)
      const cur =
        numFromData(d.currentAmount) ?? numFromData(d.current_amount)
      const tgt =
        numFromData(d.targetAmount) ?? numFromData(d.target_amount)
      if (cur != null && tgt != null) {
        parts.push(
          `${cur.toLocaleString(loc)} / ${tgt.toLocaleString(loc)} EGP`
        )
      } else {
        if (cur != null) pushAmt(cur)
        if (tgt != null) pushAmt(tgt)
      }
      const caseId = strFromData(d.caseId) || strFromData(d.case_id)
      if (caseId) parts.push(`${t('case')} ${truncateId(caseId)}`)
      break
    }
    case 'case_update': {
      const updateType =
        strFromData(d.updateType) || strFromData(d.update_type)
      if (updateType) parts.push(truncateListText(updateType, 36))
      const caseId = strFromData(d.caseId) || strFromData(d.case_id)
      if (caseId) parts.push(`${t('case')} ${truncateId(caseId)}`)
      const updateId = strFromData(d.updateId) || strFromData(d.update_id)
      if (updateId && !updateType) parts.push(truncateId(updateId))
      break
    }
    default:
      break
  }

  const structured = parts.filter(Boolean).join(LIST_SUMMARY_SEP)
  if (structured) return structured

  const msg = notificationMessage(n, locale)
  if (msg?.trim()) {
    return truncateListText(msg.replace(/\s+/g, ' '), 130)
  }
  return null
}

type DetailPanelProps = {
  notification: Notification
  locale: string
  t: (key: string) => string
  notificationTypes: { value: string; label: string }[]
  getNotificationColor: (type: string) => string
  getNotificationIcon: (type: string) => React.ReactNode
  truncateId: (id: string) => string
  getTimeAgo: (date: string) => string
  onClose?: () => void
  showHeaderBar: boolean
  onOpenContribution: (n: Notification) => void
  onViewProof: (contributionId: string) => void
  onCopyId: (text: string) => void
}

function NotificationDetailPanel({
  notification,
  locale,
  t,
  notificationTypes,
  getNotificationColor,
  getNotificationIcon,
  truncateId,
  getTimeAgo,
  onClose,
  showHeaderBar,
  onOpenContribution,
  onViewProof,
  onCopyId,
}: DetailPanelProps) {
  const txId =
    (notification.data?.new_contribution_id as string) ||
    (notification.data?.contribution_id as string)
  const parentId = notification.data?.original_contribution_id as string
  const amount = notification.data?.amount as number
  const caseTitle = notification.data?.case_title as string
  const rejectionReason = notification.data?.rejection_reason as string
  const title = notificationTitle(notification, locale)
  const message = notificationMessage(notification, locale)
  const typeLabel =
    notificationTypes.find(nt => nt.value === notification.type)?.label ||
    notification.type.replace(/_/g, ' ')

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {showHeaderBar && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t('detailPanelTitle')}
          </span>
          <div className="flex items-center gap-1">
            {(txId || parentId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary"
                onClick={() => onOpenContribution(notification)}
              >
                {t('openContribution')}
                <ExternalLink className="ms-1 h-3.5 w-3.5" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onClose}
                aria-label={t('hideDetails')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
              getNotificationColor(notification.type)
            )}
          >
            {getNotificationIcon(notification.type)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-snug text-foreground">{title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn('text-xs font-normal', getNotificationColor(notification.type))}>
                {typeLabel}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {notification.read ? t('read') : t('unread')}
              </Badge>
              {notification.type === 'contribution_pending' && (
                <Badge
                  variant="outline"
                  className="border-ma3ana-200 bg-ma3ana-50 text-xs text-ma3ana-800 dark:border-ma3ana-800 dark:bg-ma3ana-950/40 dark:text-ma3ana-200"
                >
                  {t('new')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message}</p>
        </div>

        <Separator className="my-5" />

        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('details')}</h3>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {amount != null && Number.isFinite(amount) && (
            <>
              <dt className="text-muted-foreground">{t('amount')}</dt>
              <dd className="font-medium">{amount} EGP</dd>
            </>
          )}
          {caseTitle && (
            <>
              <dt className="text-muted-foreground">{t('case')}</dt>
              <dd className="font-medium">{caseTitle}</dd>
            </>
          )}
          {txId && (
            <>
              <dt className="text-muted-foreground">{t('transactionId')}</dt>
              <dd className="flex items-center gap-2 font-mono text-xs">
                {truncateId(txId)}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onCopyId(txId)}
                  aria-label={t('copyId')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </dd>
            </>
          )}
          {parentId && (
            <>
              <dt className="text-muted-foreground">{t('parentTransaction')}</dt>
              <dd className="flex items-center gap-2 font-mono text-xs">
                {truncateId(parentId)}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onCopyId(parentId)}
                  aria-label={t('copyId')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </dd>
            </>
          )}
          {rejectionReason && (
            <>
              <dt className="col-span-full text-muted-foreground">{t('rejectionReason')}</dt>
              <dd className="col-span-full font-medium text-destructive">{rejectionReason}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{t('created')}</dt>
          <dd className="font-medium">{new Date(notification.created_at).toLocaleString()}</dd>
          <dt className="text-muted-foreground">{t('columnWhen')}</dt>
          <dd className="font-medium">{getTimeAgo(notification.created_at)}</dd>
        </dl>

        {(txId || parentId) && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenContribution(notification)}
            >
              <ExternalLink className="me-2 h-4 w-4" />
              {t('viewDetails')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => onViewProof(txId || parentId)}
            >
              <Eye className="me-2 h-4 w-4" />
              {t('viewProof')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function mapApiNotification(row: Record<string, unknown>): Notification {
  return row as unknown as Notification
}

function NotificationListTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="w-12">
            <Skeleton className="mx-auto h-9 w-9 rounded-md" />
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1.5 py-0.5">
              <Skeleton className="h-4 w-[min(280px,60vw)] max-w-full" />
              <Skeleton className="h-3 w-[min(220px,50vw)] max-w-full" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16 rounded-full" />
          </TableCell>
          <TableCell className="text-end">
            <Skeleton className="ms-auto h-3 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function NotificationDetailPanelSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background p-4 sm:p-5">
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-64 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="mb-5 h-24 w-full rounded-lg" />
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </div>
    </div>
  )
}

function NotificationsPageFallback() {
  const t = useTranslations('notifications')
  const params = useParams()
  const locale = params.locale as string
  const { containerVariant } = useLayout()
  return (
    <div className="min-h-screen bg-background">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
        <DetailPageHeader
          backUrl={`/${locale}/dashboard`}
          icon={Bell}
          title={t('title') || 'Notifications'}
          description={t('subtitle') || ''}
        />
        <Card className="overflow-hidden border border-border shadow-sm">
          <CardHeader className="border-b pb-4">
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[320px] p-4">
              <Skeleton className="mb-4 h-10 w-full" />
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}

function NotificationsPageContent() {
  const t = useTranslations('notifications')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const { containerVariant } = useLayout()

  const isDesktop = useSyncExternalStore(
    cb => {
      const mq = window.matchMedia('(min-width: 1024px)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false
  )

  const selectedNotificationId = searchParams.get('id')

  const updateSelectionInUrl = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (id) p.set('id', id)
      else p.delete('id')
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
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
        logger.error('Failed to fetch notifications')
        toast.error('Error', { description: t('failedToLoadNotifications') })
      }
    } catch (error) {
      logger.error('Error fetching notifications:', { error: error })
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

  const selectedFromList = useMemo(
    () =>
      selectedNotificationId
        ? notifications.find(n => n.id === selectedNotificationId) ?? null
        : null,
    [notifications, selectedNotificationId]
  )

  const [fetchedDetail, setFetchedDetail] = useState<Notification | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!selectedNotificationId) {
      setFetchedDetail(null)
      setDetailLoading(false)
      return
    }
    if (selectedFromList || loading) {
      if (selectedFromList) setFetchedDetail(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    void (async () => {
      try {
        const response = await fetch(`/api/notifications/${selectedNotificationId}`)
        if (!response.ok) {
          if (response.status === 404) {
            updateSelectionInUrl(null)
            toast.error(t('noNotificationsFound'))
          }
          if (!cancelled) setDetailLoading(false)
          return
        }
        const data = await response.json()
        if (!cancelled && data?.notification) {
          setFetchedDetail(mapApiNotification(data.notification as Record<string, unknown>))
        }
      } catch (e) {
        logger.error('Failed to load notification detail', { error: e })
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedNotificationId, selectedFromList, loading, updateSelectionInUrl, t])

  const selectedNotification = selectedFromList ?? fetchedDetail

  const markAsReadOptimistic = useCallback(
    (notification: Notification) => {
      if (notification.read) return
      const id = notification.id
      const prevList = notifications
      const prevUnread = unreadCount
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount(u => Math.max(0, u - 1))

      void (async () => {
        try {
          const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: id, action: 'markAsRead' }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.notification) {
              const updated = mapApiNotification(data.notification as Record<string, unknown>)
              setNotifications(prev =>
                prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n))
              )
              setFetchedDetail(prev =>
                prev?.id === updated.id ? { ...prev, ...updated } : prev
              )
            }
            if (typeof data.unreadCount === 'number') {
              setUnreadCount(data.unreadCount)
            }
          } else {
            setNotifications(prevList)
            setUnreadCount(prevUnread)
          }
        } catch (error) {
          logger.error('Error marking notification as read:', { error })
          setNotifications(prevList)
          setUnreadCount(prevUnread)
        }
      })()
    },
    [notifications, unreadCount]
  )

  const handleSelectRow = useCallback(
    (notification: Notification) => {
      updateSelectionInUrl(notification.id)
      markAsReadOptimistic(notification)
    },
    [updateSelectionInUrl, markAsReadOptimistic]
  )

  useEffect(() => {
    if (!isDesktop || !selectedNotificationId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        updateSelectionInUrl(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDesktop, selectedNotificationId, updateSelectionInUrl])

  /**
   * Deep-linked or programmatic selection: mark read when the row is on the current page.
   * Row clicks already call markAsReadOptimistic in handleSelectRow; this no-ops once read is true.
   */
  useEffect(() => {
    if (!selectedNotificationId || detailLoading) return
    const n = notifications.find(x => x.id === selectedNotificationId)
    if (!n || n.read) return
    markAsReadOptimistic(n)
  }, [selectedNotificationId, notifications, detailLoading, markAsReadOptimistic])

  useEffect(() => {
    if (!selectedNotificationId || detailLoading || !fetchedDetail || fetchedDetail.read) return
    if (notifications.some(x => x.id === selectedNotificationId)) return
    markAsReadOptimistic(fetchedDetail)
  }, [selectedNotificationId, fetchedDetail, detailLoading, notifications, markAsReadOptimistic])

  const handleMarkAllAsRead = async () => {
    const prevList = notifications
    const prevUnread = unreadCount
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      })
      if (response.ok) {
        const data = await response.json()
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount)
        }
      } else {
        setNotifications(prevList)
        setUnreadCount(prevUnread)
      }
    } catch (error) {
      logger.error('Error marking all notifications as read:', { error })
      setNotifications(prevList)
      setUnreadCount(prevUnread)
    }
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
        return 'bg-muted text-foreground/80 border-border'
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
          logger.error('Fallback copy failed:', { error: fallbackError })
          toast.error(t('copyFailed'), { description: t('unableToCopy') })
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      logger.error('Failed to copy:', { error: error })
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
      logger.error('Error fetching contribution:', { error: error })
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

  function NotificationListPane({ className }: { className?: string }) {
    return (
      <div
        className={cn('flex min-h-0 flex-1 flex-col bg-card', className)}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <Table className="w-max min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="w-12 min-w-12 text-center text-muted-foreground" aria-hidden />
                <TableHead className="min-w-[200px] whitespace-nowrap text-muted-foreground">
                  {t('columnSummary')}
                </TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap text-muted-foreground">
                  {t('type')}
                </TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap text-muted-foreground">
                  {t('status')}
                </TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap text-end text-muted-foreground">
                  {t('columnWhen')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <NotificationListTableSkeleton rows={10} />
              ) : (
                notifications.map(notification => (
                  <TableRow
                    key={notification.id}
                    data-state={selectedNotificationId === notification.id ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer',
                      !notification.read && 'bg-primary/[0.04]',
                      selectedNotificationId === notification.id && 'bg-muted'
                    )}
                    onClick={() => handleSelectRow(notification)}
                  >
                    <TableCell className="w-12 min-w-12 align-middle">
                      <div
                        className={cn(
                          'mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                          getNotificationColor(notification.type)
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[min(480px,60vw)] align-middle">
                      <div className="flex flex-col gap-1 py-0.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-medium text-foreground">
                            {notificationTitle(notification, locale)}
                          </span>
                          {!notification.read && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {t('unread')}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const secondary = notificationListSecondary(
                            notification,
                            locale,
                            t,
                            truncateId
                          )
                          return secondary ? (
                            <p
                              className="text-xs leading-snug text-muted-foreground line-clamp-2 break-words"
                              title={secondary}
                            >
                              {secondary}
                            </p>
                          ) : null
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn('shrink-0 text-xs font-normal', getNotificationColor(notification.type))}
                      >
                        {notificationTypes.find(nt => nt.value === notification.type)?.label ||
                          notification.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap">
                      <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                        {notification.read ? t('read') : t('unread')}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-end text-xs text-muted-foreground align-middle">
                      {getTimeAgo(notification.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="shrink-0 border-t px-3 py-3 sm:px-4">
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
      </div>
    )
  }

  const detailBody = detailLoading ? (
    <NotificationDetailPanelSkeleton />
  ) : selectedNotification ? (
    <NotificationDetailPanel
      notification={selectedNotification}
      locale={locale}
      t={t}
      notificationTypes={notificationTypes}
      getNotificationColor={getNotificationColor}
      getNotificationIcon={getNotificationIcon}
      truncateId={truncateId}
      getTimeAgo={getTimeAgo}
      showHeaderBar={false}
      onOpenContribution={handleViewTransactionDetails}
      onViewProof={handleViewProof}
      onCopyId={copyToClipboard}
    />
  ) : selectedNotificationId ? (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <Bell className="h-10 w-10 opacity-40" />
      <p className="max-w-xs text-sm">{t('failedToLoadNotifications')}</p>
    </div>
  ) : (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <Bell className="h-10 w-10 opacity-40" />
      <p className="max-w-xs text-sm">{t('selectNotificationHint')}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
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
            className: 'border border-meen-200 bg-meen-100 font-semibold text-meen-800 dark:border-meen-800 dark:bg-meen-950/50 dark:text-meen-200'
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
        <Card className="mb-6 border border-border shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <span className="text-xs text-muted-foreground">{t('activeFilters')}:</span>
                  {searchQuery && (
                    <Badge variant="outline" className="text-xs">
                      {t('search')}: {searchQuery}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ms-1.5 hover:text-destructive"
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
                        className="ms-1.5 hover:text-destructive"
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
                        className="ms-1.5 hover:text-destructive"
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

        {/* Notifications: full-width table; detail opens as overlay sheet */}
        <Card className="overflow-hidden border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t('notifications')}
              {total > 0 && (
                <Badge
                  variant="outline"
                  className="border-meen-200 bg-meen-50 text-xs font-medium text-meen-900 dark:border-meen-800 dark:bg-meen-950/40 dark:text-meen-200"
                >
                  {total} {total === 1 ? t('notification') : t('notificationsCount')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!loading && notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {hasActiveFilters ? t('noNotificationsFound') : t('noNotificationsYet')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? t('tryAdjustingFilters') : t('notificationsWillAppear')}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                    {t('clearFilters')}
                  </Button>
                )}
              </div>
            ) : isDesktop ? (
              selectedNotificationId ? (
                <ResizablePanelGroup
                  direction="horizontal"
                  className={cn(
                    'min-h-[min(560px,calc(100vh-12rem))] h-[calc(100vh-12rem)] max-h-[min(900px,calc(100vh-10rem))]',
                    locale === 'ar' && 'flex-row-reverse'
                  )}
                  defaultLayout={{ list: 40, detail: 60 }}
                >
                  <ResizablePanel id="list" minSize="22%" className="min-w-0">
                    <NotificationListPane className="h-full" />
                  </ResizablePanel>
                  <ResizableHandle withHandle className="w-1.5 bg-border" />
                  <ResizablePanel id="detail" minSize="28%" className="min-w-0">
                    <div className="flex h-full min-h-0 flex-col bg-background">
                      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
                        <FolderKanban className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        <h2 className="min-w-0 flex-1 text-base font-semibold text-foreground">
                          {t('detailPanelTitle')}
                        </h2>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => updateSelectionInUrl(null)}
                          aria-label={t('hideDetails')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto">{detailBody}</div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="min-h-[min(560px,calc(100vh-12rem))] h-[calc(100vh-12rem)] max-h-[min(900px,calc(100vh-10rem))]">
                  <NotificationListPane className="h-full" />
                </div>
              )
            ) : (
              <>
                <NotificationListPane />
                <Sheet
                  open={Boolean(selectedNotificationId)}
                  onOpenChange={open => {
                    if (!open) updateSelectionInUrl(null)
                  }}
                >
                  <SheetContent
                    side={locale === 'ar' ? 'left' : 'right'}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    className={cn(
                      'flex h-full max-h-screen w-full flex-col gap-0 border-border bg-background p-0 shadow-2xl',
                      'max-w-full sm:max-w-md lg:max-w-lg xl:max-w-xl'
                    )}
                    onCloseAutoFocus={e => e.preventDefault()}
                  >
                    <SheetHeader className="space-y-0 border-b border-border px-4 py-3 text-start sm:px-5 sm:py-4 pe-14">
                      <SheetTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <FolderKanban className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        {t('detailPanelTitle')}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">{detailBody}</div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Proof Modal */}
        {showProofModal && proofData && (
          <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
            <DialogContent
              className="max-h-[90vh] max-w-4xl overflow-hidden"
              aria-describedby={undefined}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
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
                  <div className="text-sm text-muted-foreground">
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

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsPageFallback />}>
      <NotificationsPageContent />
    </Suspense>
  )
}
