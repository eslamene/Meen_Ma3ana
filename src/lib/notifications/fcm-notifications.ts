/**
 * Firebase Cloud Messaging (FCM) Notification Service
 * Uses Supabase Edge Function to send push notifications via FCM
 */

import { env } from '@/config/env'
import { defaultLogger as logger } from '@/lib/logger'
import { defaultLocale } from '@/i18n/request'

interface FCMNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
}

export class FCMNotificationService {
  private edgeFunctionUrl: string

  constructor() {
    // Construct Edge Function URL
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '')
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/push-fcm`
    
    // Log the Edge Function URL in development for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.info('FCM Edge Function URL configured', {
        url: this.edgeFunctionUrl,
        supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      })
    }
  }

  /**
   * Send push notification via FCM Edge Function
   */
  private async sendViaEdgeFunction(
    userIds: string[] | undefined,
    notification: FCMNotificationPayload
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    try {
      logger.info('Calling FCM Edge Function', {
        url: this.edgeFunctionUrl,
        userIdCount: userIds?.length || 0,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      })

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userIds,
          notification,
          data: notification.data,
        }),
      })

      if (!response.ok) {
        let errorMessage = `FCM Edge Function failed: ${response.status} ${response.statusText}`
        let errorDetails: any = null
        
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorDetails = errorData
              if (errorData.error || errorData.message) {
                errorMessage = errorData.error || errorData.message || errorMessage
              }
              // Include details if available
              if (errorData.details) {
                errorMessage += ` - ${errorData.details}`
              }
            } catch {
              // Not JSON, use text as is
              if (errorText.trim().length > 0) {
                errorMessage = errorText
              }
            }
          }
        } catch (parseError) {
          // Failed to parse error - use default message
          logger.warn('Failed to parse FCM Edge Function error response', {
            status: response.status,
            statusText: response.statusText
          })
        }
        
        const fcmError = new Error(errorMessage)
        logger.error('FCM Edge Function error', fcmError, {
          status: response.status,
          statusText: response.statusText,
          url: this.edgeFunctionUrl,
          errorDetails,
        })
        throw fcmError
      }

      const result = await response.json()
      return {
        success: result.success || false,
        sent: result.sent || 0,
        failed: result.failed || 0,
        total: result.total || 0,
      }
    } catch (error) {
      // Convert error to proper Error instance
      let errorToLog: Error
      if (error instanceof Error) {
        errorToLog = error
      } else if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        const message = errorObj.message as string | undefined
        const code = errorObj.code as string | undefined
        errorToLog = new Error(message || code || 'Unknown FCM Edge Function error')
        if (code) {
          (errorToLog as any).code = code
        }
      } else {
        errorToLog = new Error('Unknown FCM Edge Function error')
      }
      logger.error('Error calling FCM Edge Function', errorToLog)
      throw errorToLog
    }
  }

  /**
   * Notify all users (broadcast)
   */
  async notifyAllUsers(notification: FCMNotificationPayload): Promise<number> {
    logger.info('Sending FCM notification to all users', {
      title: notification.title,
      body: notification.body,
      edgeFunctionUrl: this.edgeFunctionUrl,
    })

    try {
      const result = await this.sendViaEdgeFunction(undefined, notification)
      
      logger.info('FCM broadcast completed', {
        sent: result.sent,
        failed: result.failed,
        total: result.total,
      })

      if (result.sent === 0 && result.total === 0) {
        logger.warn('No FCM tokens found in database - no users are subscribed to push notifications')
      }

      return result.sent
    } catch (error) {
      logger.error('Error in notifyAllUsers:', error)
      throw error
    }
  }

  /**
   * Notify specific users
   */
  async notifyUsers(
    userIds: string[],
    notification: FCMNotificationPayload
  ): Promise<number> {
    if (userIds.length === 0) {
      logger.warn('No user IDs provided to notifyUsers')
      return 0
    }

    logger.info('Sending FCM notification to specific users', {
      userIdCount: userIds.length,
      title: notification.title,
      body: notification.body,
    })

    const result = await this.sendViaEdgeFunction(userIds, notification)
    
    logger.info('FCM notification to users completed', {
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      userIdCount: userIds.length,
    })

    return result.sent
  }

  /**
   * Notify all users about a new case being published
   */
  async notifyCaseCreated(caseId: string, caseTitle: string, caseTitleAr?: string): Promise<void> {
    try {
      await this.notifyAllUsers({
        title: 'New Case Available',
        body: caseTitle || caseTitleAr || 'A new case has been created',
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          type: 'case_created',
          caseId,
          url: `/${defaultLocale}/cases/${caseId}`,
        },
        tag: `case-${caseId}`,
        requireInteraction: true,
      })
    } catch (error) {
      logger.error('Error sending case creation notification:', error)
    }
  }

  /**
   * Notify all users about a case completion (closed)
   */
  async notifyCaseCompleted(caseId: string, caseTitle: string, caseTitleAr?: string): Promise<void> {
    try {
      await this.notifyAllUsers({
        title: 'Case Completed! 🎉',
        body: `${caseTitle || caseTitleAr || 'A case'} has been completed. Thank you to everyone who contributed!`,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          type: 'case_completed',
          caseId,
          url: `/${defaultLocale}/cases/${caseId}`,
        },
        tag: `case-completed-${caseId}`,
        requireInteraction: true,
      })
    } catch (error) {
      logger.error('Error sending case completion notification:', error)
    }
  }

  /**
   * Notify contributing users about a case update
   */
  async notifyCaseUpdated(
    caseId: string,
    caseTitle: string,
    caseTitleAr: string | undefined,
    updateTitle: string,
    contributorUserIds: string[]
  ): Promise<void> {
    try {
      if (contributorUserIds.length === 0) {
        logger.info(`No contributors to notify for case ${caseId}`)
        return
      }

      await this.notifyUsers(contributorUserIds, {
        title: `Case Update: ${caseTitle || caseTitleAr || 'Case'}`,
        body: updateTitle,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          type: 'case_updated',
          caseId,
          url: `/${defaultLocale}/cases/${caseId}`,
        },
        tag: `case-update-${caseId}`,
        requireInteraction: false,
      })
    } catch (error) {
      logger.error('Error sending case update notification:', error)
    }
  }

  /**
   * Notify users about a case status change
   */
  async notifyCaseStatusChanged(
    caseId: string,
    caseTitle: string,
    caseTitleAr: string | undefined,
    oldStatus: string,
    newStatus: string,
    creatorId: string,
    contributorUserIds: string[]
  ): Promise<void> {
    try {
      const statusNames: Record<string, string> = {
        draft: 'Draft',
        submitted: 'Submitted',
        under_review: 'Under Review',
        published: 'Published',
        closed: 'Closed',
        completed: 'Completed'
      }

      const oldStatusName = statusNames[oldStatus] || oldStatus
      const newStatusName = statusNames[newStatus] || newStatus

      // Combine creator and contributors (remove duplicates)
      const allUserIds = [...new Set([creatorId, ...contributorUserIds])]
      
      logger.info('Sending case status change notification', {
        caseId,
        oldStatus,
        newStatus,
        userIds: allUserIds,
        userIdCount: allUserIds.length
      })

      if (allUserIds.length === 0) {
        logger.warn('No users to notify for case status change', { caseId })
        return
      }

      await this.notifyUsers(allUserIds, {
        title: `Case Status Changed: ${caseTitle || caseTitleAr || 'Case'}`,
        body: `Status changed from ${oldStatusName} to ${newStatusName}`,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          type: 'case_status_changed',
          caseId,
          oldStatus,
          newStatus,
          url: `/${defaultLocale}/cases/${caseId}`,
        },
        tag: `case-status-${caseId}-${newStatus}`,
        requireInteraction: newStatus === 'published' || newStatus === 'closed',
      })
    } catch (error) {
      logger.error('Error sending case status change notification:', error)
    }
  }
}

export const fcmNotificationService = new FCMNotificationService()

