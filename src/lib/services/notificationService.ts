/**
 * Notification Service
 * Handles all notification-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Notification {
  id: string
  recipient_id: string
  type: string
  title?: string | null
  title_en?: string | null
  title_ar?: string | null
  message?: string | null
  message_en?: string | null
  message_ar?: string | null
  link?: string | null
  read: boolean
  read_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateNotificationData {
  recipient_id: string
  type: string
  title?: string
  title_en?: string
  title_ar?: string
  message?: string
  message_en?: string
  message_ar?: string
  link?: string | null
}

export interface NotificationSearchParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  readStatus?: 'read' | 'unread' | ''
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  recipientId: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  unreadCount?: number
}

export class NotificationService {
  /**
   * Get notifications with filtering and pagination
   * @param supabase - Supabase client (server-side only)
   */
  static async getNotifications(
    supabase: SupabaseClient,
    params: NotificationSearchParams
  ): Promise<NotificationListResponse> {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = '',
      readStatus = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      recipientId,
    } = params

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_id', recipientId)

    // Apply search filter
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(
        `title.ilike.%${escapedSearch}%,message.ilike.%${escapedSearch}%,title_en.ilike.%${escapedSearch}%,title_ar.ilike.%${escapedSearch}%,message_en.ilike.%${escapedSearch}%,message_ar.ilike.%${escapedSearch}%`
      )
    }

    // Apply type filter
    if (type) {
      query = query.eq('type', type)
    }

    // Apply read status filter
    if (readStatus === 'read') {
      query = query.eq('read', true)
    } else if (readStatus === 'unread') {
      query = query.eq('read', false)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending })
    } else if (sortBy === 'type') {
      query = query.order('type', { ascending })
    } else if (sortBy === 'read') {
      query = query.order('read', { ascending })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error, count } = await query

    if (error) {
      defaultLogger.error('Error fetching notifications:', error)
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('read', false)

    return {
      notifications: (notifications || []) as Notification[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      unreadCount: unreadCount || 0
    }
  }

  /**
   * Get notification by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching notification:', error)
      throw new Error(`Failed to fetch notification: ${error.message}`)
    }

    return data as Notification
  }

  /**
   * Create a new notification
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreateNotificationData): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: data.recipient_id,
        type: data.type,
        title: data.title || null,
        title_en: data.title_en || data.title || null,
        title_ar: data.title_ar || null,
        message: data.message || null,
        message_en: data.message_en || data.message || null,
        message_ar: data.message_ar || null,
        link: data.link || null,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating notification:', error)
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    return notification as Notification
  }

  /**
   * Mark notification as read
   * @param supabase - Supabase client (server-side only)
   */
  static async markAsRead(supabase: SupabaseClient, id: string): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error marking notification as read:', error)
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }

    return notification as Notification
  }

  /**
   * Mark all notifications as read for a user
   * @param supabase - Supabase client (server-side only)
   */
  static async markAllAsRead(supabase: SupabaseClient, recipientId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('recipient_id', recipientId)
      .eq('read', false)

    if (error) {
      defaultLogger.error('Error marking all notifications as read:', error)
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
    }
  }

  /**
   * Delete notification
   * @param supabase - Supabase client (server-side only)
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      defaultLogger.error('Error deleting notification:', error)
      throw new Error(`Failed to delete notification: ${error.message}`)
    }
  }

  /**
   * Get unread count for a user
   * @param supabase - Supabase client (server-side only)
   */
  static async getUnreadCount(supabase: SupabaseClient, recipientId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('read', false)

    if (error) {
      defaultLogger.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  }
}

