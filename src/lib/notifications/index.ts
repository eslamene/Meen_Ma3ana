import { createClient } from '@/lib/supabase/client'

import { defaultLogger } from '@/lib/logger'

export interface UnifiedNotification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
  recipient_id: string
}

export class UnifiedNotificationService {
  private supabase = createClient()

  async getUserNotifications(userId: string, limit: number = 20): Promise<UnifiedNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        defaultLogger.error('Error fetching user notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      defaultLogger.error('Error fetching user notifications:', error)
      return []
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false)

      if (error) {
        defaultLogger.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      defaultLogger.error('Error getting unread count:', error)
      return 0
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
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

  async markAllAsRead(userId: string): Promise<boolean> {
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
}

export const unifiedNotificationService = new UnifiedNotificationService() 