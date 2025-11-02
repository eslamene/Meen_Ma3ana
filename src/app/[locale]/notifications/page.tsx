'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bell, Check, CheckCheck, MessageSquare, TrendingUp, DollarSign, Target, XCircle, AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronRight, ExternalLink, Eye, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface Notification {
  id: string
  type: string
  title: string
  message: string
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
  const { toast } = useToast()
  
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

  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
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
      toast({
        title: 'Error',
        description: 'Failed to load notifications'
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

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

  const getTimeAgo = (dateString: string) => {
    // Parse the date string and ensure it's treated as UTC
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'))
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    
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
        toast({
          title: 'Copied',
          description: 'Transaction ID copied to clipboard'
        })
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
          toast({
            title: 'Copied',
            description: 'Transaction ID copied to clipboard'
          })
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError)
          toast({
            title: 'Copy Failed',
            description: 'Unable to copy to clipboard. Please copy manually.'
          })
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard. Please copy manually.'
      })
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
          toast({
            title: 'No Proof Available',
            description: 'This contribution does not have a payment proof attached.',
            type: 'warning'
          })
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch contribution details.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error fetching contribution:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch contribution details.',
        type: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications')}
              {unreadCount > 0 && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                <p className="text-gray-500">You&apos;ll see notifications here when there are updates about your contributions or cases you&apos;re following.</p>
              </div>
            ) : (
              <div className="space-y-4">
              {notifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id)
                const txId = (notification.data?.new_contribution_id as string) || (notification.data?.contribution_id as string)
                const parentId = notification.data?.original_contribution_id as string
                const amount = notification.data?.amount as number
                const caseTitle = notification.data?.case_title as string
                const rejectionReason = notification.data?.rejection_reason as string

                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg transition-all hover:shadow-md ${
                      !notification.read ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">{notification.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            {(() => {
                              // Show transaction ids when available
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
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          copyToClipboard(txId || parentId)
                                        }}
                                        aria-label="Copy ID"
                                        title="Copy Transaction ID"
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
                            <Badge variant="outline" className={getNotificationColor(notification.type)}>
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            {notification.type === 'contribution_pending' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <Check className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(notification.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            aria-label={isExpanded ? "Hide details" : "Show details"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expandable Details Section */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-3 space-y-2">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Transaction Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {amount && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-medium">{amount} EGP</span>
                              </div>
                            )}
                            {caseTitle && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Case:</span>
                                <span className="font-medium">{caseTitle}</span>
                              </div>
                            )}
                            {txId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Transaction ID:</span>
                                <span className="font-mono text-xs">{truncateId(txId)}</span>
                              </div>
                            )}
                            {parentId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Parent Transaction:</span>
                                <span className="font-mono text-xs">{truncateId(parentId)}</span>
                              </div>
                            )}
                            {rejectionReason && (
                              <div className="flex justify-between col-span-full">
                                <span className="text-gray-600">Rejection Reason:</span>
                                <span className="font-medium text-red-600">{rejectionReason}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Created:</span>
                              <span className="font-medium">{new Date(notification.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${
                                notification.read ? 'text-green-600' : 'text-blue-600'
                              }`}>
                                {notification.read ? 'Read' : 'Unread'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          {(txId || parentId) && (
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewTransactionDetails(notification)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center justify-center gap-2"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View Details
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewProof(txId || parentId)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center justify-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Proof
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
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
                  Payment Proof
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
                    <p><strong>Contribution ID:</strong> {truncateId(proofData.contributionId)}</p>
                    {proofData.amount && <p><strong>Amount:</strong> {proofData.amount} EGP</p>}
                    {proofData.caseTitle && <p><strong>Case:</strong> {proofData.caseTitle}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(proofData.contributionId!)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proofData.proofUrl, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
} 