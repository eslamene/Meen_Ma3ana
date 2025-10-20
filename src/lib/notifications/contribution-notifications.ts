import { createClient } from '@/lib/supabase/client'

export interface ContributionNotification {
  id: string
  type: 'contribution_approved' | 'contribution_rejected' | 'contribution_pending'
  recipient_id: string
  title: string
  message: string
  data?: Record<string, any>
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
        read: false,
        created_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        console.error('Error sending approval notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending approval notification:', error)
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
        read: false,
        created_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        console.error('Error sending rejection notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending rejection notification:', error)
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
        read: false,
        created_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification)

      if (error) {
        console.error('Error sending pending notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending pending notification:', error)
      return false
    }
  }

  async getUserNotifications(userId: string): Promise<ContributionNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01') { // Table doesn't exist
          console.warn('Notifications table does not exist yet')
          return []
        }
        console.error('Error fetching user notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      return []
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
        console.error('Error marking all notifications as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
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
          console.warn('Notifications table does not exist yet')
          return 0
        }
        console.error('Error getting unread notification count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread notification count:', error)
      return 0
    }
  }
}

export const contributionNotificationService = new ContributionNotificationService() 