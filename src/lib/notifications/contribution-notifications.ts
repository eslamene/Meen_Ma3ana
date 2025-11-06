import { createClient } from '@/lib/supabase/server'

import { defaultLogger } from '@/lib/logger'

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
  private supabase = createClient()

  async sendApprovalNotification(contributionId: string, donorId: string, amount: number, caseTitle: string) {
    try {
      const notification = {
        type: 'contribution_approved' as const,
        recipient_id: donorId,
        title: 'Contribution Approved',
        message: `Your contribution of $${amount} for "${caseTitle}" has been approved. Thank you for your generosity!`,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle
        },
        read: false
        // Remove created_at to let database set the timestamp
      }

      const { error } = await (await this.supabase).from('notifications')
        .insert(notification)

      if (error) {
        defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
      return false
    }
  }

  async sendRejectionNotification(contributionId: string, donorId: string, amount: number, caseTitle: string, reason: string) {
    try {
      const notification = {
        type: 'contribution_rejected' as const,
        recipient_id: donorId,
        title: 'Contribution Rejected',
        message: `Your contribution of $${amount} for "${caseTitle}" has been rejected. Reason: ${reason}`,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle,
          rejection_reason: reason
        },
        read: false
        // Remove created_at to let database set the timestamp
      }

      const { error } = await (await this.supabase)
        .from('notifications')
        .insert(notification)

      if (error) {
        defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
        return false
      }

      return true
    } catch (error) {
      defaultLogger.logStableError('INTERNAL_SERVER_ERROR', error)
      return false
    }
  }

  async sendPendingNotification(contributionId: string, donorId: string, amount: number, caseTitle: string) {
    try {
      const notification = {
        type: 'contribution_pending' as const,
        recipient_id: donorId,
        title: 'Contribution Submitted',
        message: `Your contribution of $${amount} for "${caseTitle}" has been submitted and is under review.`,
        data: {
          contribution_id: contributionId,
          amount,
          case_title: caseTitle
        },
        read: false
        // Remove created_at to let database set the timestamp
      }

      const { error } = await (await this.supabase)
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
      const { data, error } = await (await this.supabase)
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
      const { error } = await (await this.supabase)
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
      const { error } = await (await this.supabase)
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
      const { error } = await (await this.supabase)
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
      const { count, error } = await (await this.supabase)
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

export const contributionNotificationService = new ContributionNotificationService() 