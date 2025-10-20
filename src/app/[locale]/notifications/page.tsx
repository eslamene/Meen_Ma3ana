'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, MessageSquare, TrendingUp, DollarSign, Target, XCircle, AlertTriangle, Heart, RefreshCw, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
  recipient_id: string
}

export default function NotificationsPage() {
  const t = useTranslations('notifications')
  const params = useParams()
  const locale = params.locale as string
  const { addToast } = useToast()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load notifications',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId)
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to mark notification as read',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark notification as read',
        duration: 5000
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark-all-read' }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        )
        setUnreadCount(0)
        addToast({
          type: 'success',
          title: 'Success',
          message: 'All notifications marked as read',
          duration: 3000
        })
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to mark all notifications as read',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark all notifications as read',
        duration: 5000
      })
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
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'case_progress':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'case_contribution':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'case_milestone':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'contribution_approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'contribution_rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'contribution_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'contribution_revised':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const truncateId = (id?: string) => {
    if (!id) return ''
    if (id.length <= 12) return id
    return `${id.slice(0, 6)}...${id.slice(-6)}`
  }

  const copyToClipboard = async (text?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      addToast({ type: 'success', title: 'Copied', message: 'Transaction ID copied to clipboard', duration: 2500 })
    } catch {
      addToast({ type: 'error', title: 'Copy failed', message: 'Could not copy ID', duration: 3000 })
    }
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.data?.caseId) {
      window.location.href = `/${locale}/cases/${notification.data.caseId}`
    } else if (notification.data?.contribution_id) {
      // Navigate to contributions page or case page
      window.location.href = `/${locale}/contributions`
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-gray-600">Stay updated with your contribution status and important updates</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500">You'll see notifications here when there are updates about your contributions or cases you're following.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Group rejected + revised into threads by original contribution id
                const threads: Record<string, { parent?: Notification; children: Notification[] }> = {}
                const standalone: Notification[] = []

                notifications.forEach((n) => {
                  if (n.type === 'contribution_rejected' && n.data?.contribution_id) {
                    const key = n.data.contribution_id as string
                    if (!threads[key]) threads[key] = { children: [] }
                    const existing = threads[key].parent
                    if (!existing || new Date(n.created_at) > new Date(existing.created_at)) {
                      threads[key].parent = n
                    }
                  } else if (n.type === 'contribution_revised' && n.data?.original_contribution_id) {
                    const key = n.data.original_contribution_id as string
                    if (!threads[key]) threads[key] = { children: [] }
                    threads[key].children.push(n)
                  } else {
                    standalone.push(n)
                  }
                })

                // Sort groups/newest first
                const groups = Object.entries(threads)
                  .map(([key, g]) => ({ key, ...g }))
                  .sort((a, b) => {
                    const maxA = [a.parent?.created_at, ...a.children.map(c => c.created_at)].filter(Boolean).sort().pop() || '1970'
                    const maxB = [b.parent?.created_at, ...b.children.map(c => c.created_at)].filter(Boolean).sort().pop() || '1970'
                    return new Date(maxB).getTime() - new Date(maxA).getTime()
                  })

                const renderItem = (notification: Notification, nested = false) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                      !notification.read ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200'
                    } ${nested ? 'ml-10' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{notification.title}</h4>
                            <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                            <div className="flex flex-wrap items-center gap-3">
                              {(() => {
                                // Show transaction ids when available
                                const txId = (notification.data?.new_contribution_id as string) || (notification.data?.contribution_id as string)
                                const parentId = notification.data?.original_contribution_id as string
                                if (txId || parentId) {
                                  return (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      {txId && (
                                        <span className="font-mono">TX: {truncateId(txId)}</span>
                                      )}
                                      {parentId && (
                                        <span className="font-mono">Parent: {truncateId(parentId)}</span>
                                      )}
                                      {(txId || parentId) && (
                                        <button
                                          className="text-gray-400 hover:text-gray-600"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            copyToClipboard(txId || parentId)
                                          }}
                                          aria-label="Copy ID"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                              <span className="text-xs text-gray-400">{formatRelativeDate(notification.created_at)}</span>
                              <Badge variant="outline" className={`text-xs ${getNotificationColor(notification.type)}`}>
                                {notification.type.replace('_', ' ')}
                              </Badge>
                              {!notification.read && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                          </div>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              disabled={markingAsRead === notification.id}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {markingAsRead === notification.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )

                return (
                  <>
                    {/* Render grouped threads */}
                    {groups.map((g) => (
                      <div key={g.key} className="space-y-2">
                        {g.parent ? renderItem(g.parent, false) : null}
                        {g.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((child) => renderItem(child, true))}
                      </div>
                    ))}
                    {/* Render standalone notifications */}
                    {standalone.map((n) => renderItem(n, false))}
                  </>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 