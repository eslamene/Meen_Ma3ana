import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import { createBilingualNotification, NOTIFICATION_TEMPLATES } from './bilingual-helpers'
import { fcmNotificationService } from './fcm-notifications'

export interface ContributionNotification {
  id: string
  type: 'contribution_approved' | 'contribution_rejected' | 'contribution_pending'
  recipient_id: string
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

export class ContributionNotificationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get locale from user preferences or default to 'en'
   */
  private getLocale(): string {
    // Default to 'en' - can be enhanced to get from user preferences
    return 'en'
  }

  async sendApprovalNotification(contributionId: string, donorId: string, amount: number, caseTitle: string) {
    try {
      const content = createBilingualNotification(
        NOTIFICATION_TEMPLATES.contributionApproved.title_en,
        NOTIFICATION_TEMPLATES.contributionApproved.title_ar,
        NOTIFICATION_TEMPLATES.contributionApproved.message_en,
        NOTIFICATION_TEMPLATES.contributionApproved.message_ar,
        { amount, caseTitle }
      )

      const notification = {
        type: 'contribution_approved' as const,
        recipient_id: donorId,
        title_en: content.title_en,
        title_ar: content.title_ar,
        message_en: content.message_en,
        message_ar: content.message_ar,
        // Legacy fields for backward compatibility
        title: content.title_en,
        message: content.message_en,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle
        },
        read: false
      }

      const { error } = await this.supabase.from('notifications')
        .insert(notification)

      if (error) {
        defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
        return false
      }

      // Send push notification to donor
      try {
        defaultLogger.info('Sending push notification for contribution approval', {
          contributionId,
          donorId,
          amount,
          caseTitle
        })
        
        const sentCount = await fcmNotificationService.notifyUsers(
          [donorId],
          {
            title: content.title_en,
            body: content.message_en,
            icon: '/logo.png',
            badge: '/logo.png',
            data: {
              type: 'contribution_approved',
              contribution_id: contributionId,
              case_title: caseTitle,
              amount: amount.toString(),
              url: `/${this.getLocale()}/contributions/${contributionId}`,
            },
            tag: `contribution-${contributionId}`,
            requireInteraction: false,
          }
        )
        
        if (sentCount > 0) {
          defaultLogger.info('Push notification sent successfully for contribution approval', {
            contributionId,
            donorId,
            sentCount
          })
        } else {
          defaultLogger.warn('Push notification sent but no active FCM tokens found for user', {
            contributionId,
            donorId,
            sentCount
          })
        }
      } catch (pushError) {
        // Log detailed error but don't fail the operation
        defaultLogger.error('Failed to send push notification for contribution approval', pushError, {
          contributionId,
          donorId,
          error: pushError instanceof Error ? pushError.message : String(pushError),
          stack: pushError instanceof Error ? pushError.stack : undefined
        })
      }

      return true
    } catch (error) {
      defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
      return false
    }
  }

  async sendRejectionNotification(contributionId: string, donorId: string, amount: number, caseTitle: string, reason: string) {
    try {
      const content = createBilingualNotification(
        NOTIFICATION_TEMPLATES.contributionRejected.title_en,
        NOTIFICATION_TEMPLATES.contributionRejected.title_ar,
        NOTIFICATION_TEMPLATES.contributionRejected.message_en,
        NOTIFICATION_TEMPLATES.contributionRejected.message_ar,
        { amount, caseTitle, reason }
      )

      const notification = {
        type: 'contribution_rejected' as const,
        recipient_id: donorId,
        title_en: content.title_en,
        title_ar: content.title_ar,
        message_en: content.message_en,
        message_ar: content.message_ar,
        // Legacy fields for backward compatibility
        title: content.title_en,
        message: content.message_en,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle,
          rejection_reason: reason
        },
        read: false
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
        return false
      }

      // Send push notification to donor
      try {
        defaultLogger.info('Sending push notification for contribution rejection', {
          contributionId,
          donorId,
          amount,
          caseTitle,
          reason
        })
        
        const sentCount = await fcmNotificationService.notifyUsers(
          [donorId],
          {
            title: content.title_en,
            body: content.message_en,
            icon: '/logo.png',
            badge: '/logo.png',
            data: {
              type: 'contribution_rejected',
              contribution_id: contributionId,
              case_title: caseTitle,
              amount: amount.toString(),
              rejection_reason: reason,
              url: `/${this.getLocale()}/contributions/${contributionId}`,
            },
            tag: `contribution-${contributionId}`,
            requireInteraction: true, // Rejections are more important, require interaction
          }
        )
        
        if (sentCount > 0) {
          defaultLogger.info('Push notification sent successfully for contribution rejection', {
            contributionId,
            donorId,
            sentCount
          })
        } else {
          defaultLogger.warn('Push notification sent but no active FCM tokens found for user', {
            contributionId,
            donorId,
            sentCount
          })
        }
      } catch (pushError) {
        // Log detailed error but don't fail the operation
        defaultLogger.error('Failed to send push notification for contribution rejection', pushError, {
          contributionId,
          donorId,
          error: pushError instanceof Error ? pushError.message : String(pushError),
          stack: pushError instanceof Error ? pushError.stack : undefined
        })
      }

      return true
    } catch (error) {
      defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
      return false
    }
  }

  async sendPendingNotification(contributionId: string, donorId: string, amount: number, caseTitle: string) {
    try {
      const content = createBilingualNotification(
        NOTIFICATION_TEMPLATES.contributionPending.title_en,
        NOTIFICATION_TEMPLATES.contributionPending.title_ar,
        NOTIFICATION_TEMPLATES.contributionPending.message_en,
        NOTIFICATION_TEMPLATES.contributionPending.message_ar,
        { amount, caseTitle }
      )

      const notification = {
        type: 'contribution_pending' as const,
        recipient_id: donorId,
        title_en: content.title_en,
        title_ar: content.title_ar,
        message_en: content.message_en,
        message_ar: content.message_ar,
        // Legacy fields for backward compatibility
        title: content.title_en,
        message: content.message_en,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle
        },
        read: false
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        defaultLogger.error('Error sending pending notification:', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
      return false
    }
  }

  async getUserNotifications(userId: string): Promise<ContributionNotification[]> {
    try {
      // Get all notifications and sort them properly on the client side
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01') { // Table doesn't exist
          defaultLogger.warn('Notifications table does not exist yet')
          return []
        }
        defaultLogger.error('Error fetching user notifications:', error)
        return []
      }

      // Force proper client-side sorting
      const sortedData = (data || []).sort((a, b) => {
        // Try to parse dates, fallback to 0 if invalid
        let dateA = 0
        let dateB = 0
        
        if (a.created_at) {
          const parsedA = new Date(a.created_at)
          dateA = isNaN(parsedA.getTime()) ? 0 : parsedA.getTime()
        }
        
        if (b.created_at) {
          const parsedB = new Date(b.created_at)
          dateB = isNaN(parsedB.getTime()) ? 0 : parsedB.getTime()
        }
        
        // Debug logging removed - sorting is now working correctly
        
        // If both dates are valid, sort by date
        if (dateA > 0 && dateB > 0) {
          return dateB - dateA // Newest first
        }
        
        // If dates are equal or invalid, sort by ID (newer IDs first)
        return b.id.localeCompare(a.id)
      })

      return sortedData
    } catch (error) {
      defaultLogger.error('Error fetching user notifications:', error)
      return []
    }
  }

  async markNotificationAsReadSimple(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        defaultLogger.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.error('Error marking notification as read:', error)
      return false
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      if (error) {
        defaultLogger.error('Error marking all notifications as read:', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.error('Error marking all notifications as read:', error)
      return false
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('recipient_id', userId)

      if (error) {
        defaultLogger.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.error('Error marking notification as read:', error)
      return false
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      if (error) {
        // If table doesn't exist, return 0 instead of throwing
        if (error.code === '42P01') { // Table doesn't exist
          defaultLogger.warn('Notifications table does not exist yet')
          return 0
        }
        defaultLogger.error('Error getting unread notification count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      defaultLogger.error('Error getting unread notification count:', error)
      return 0
    }
  }
}

// Note: This service now requires a Supabase client to be passed.
// Use createContributionNotificationService(client) helper function instead.
// This export is kept for backward compatibility but will throw an error if used.
// It will be removed in a future version.
export const contributionNotificationService = null as unknown as ContributionNotificationService

/**
 * Factory function to create a ContributionNotificationService instance
 * with the appropriate Supabase client (server or client)
 */
export function createContributionNotificationService(supabase: SupabaseClient): ContributionNotificationService {
  return new ContributionNotificationService(supabase)
} 