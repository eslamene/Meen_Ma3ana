import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { notifications, users, cases } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'

import { defaultLogger } from '@/lib/logger'

export interface CaseNotification {
  id: string
  userId: string
  type: 'case_update' | 'case_progress' | 'case_contribution' | 'case_milestone'
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: Date
  caseId?: string
}

export interface CreateNotificationParams {
  userId: string
  type: 'case_update' | 'case_progress' | 'case_contribution' | 'case_milestone'
  title: string
  message: string
  data?: Record<string, any>
  caseId?: string
}

export class CaseNotificationService {
  /**
   * Create a notification for a case update
   */
  async createCaseUpdateNotification(
    caseId: string,
    updateId: string,
    updateTitle: string,
    updateType: string,
    createdBy: string
  ) {
    try {
      // Get case details
      const [caseData] = await db
        .select({
          id: cases.id,
          title: cases.title,
          created_by: cases.created_by,
        })
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!caseData) return

      // Get all users who should be notified (case creator, contributors, followers)
      const usersToNotify = await this.getUsersToNotify(caseId)

      // Create notifications for each user
      const notificationPromises = usersToNotify.map(userId =>
        this.createNotification({
          userId,
          type: 'case_update',
          title: `Case Update: ${caseData.title}`,
          message: `${updateTitle} - ${updateType} update`,
          data: {
            caseId,
            updateId,
            updateType,
            createdBy,
          },
          caseId,
        })
      )

      await Promise.all(notificationPromises)
    } catch (error) {
      defaultLogger.error('Error creating case update notification:', error)
    }
  }

  /**
   * Create a notification for case progress milestone
   */
  async createProgressMilestoneNotification(
    caseId: string,
    milestone: '25%' | '50%' | '75%' | '100%',
    currentAmount: number,
    targetAmount: number
  ) {
    try {
      const [caseData] = await db
        .select({
          id: cases.id,
          title: cases.title,
        })
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!caseData) return

      const usersToNotify = await this.getUsersToNotify(caseId)

      const notificationPromises = usersToNotify.map(userId =>
        this.createNotification({
          userId,
          type: 'case_progress',
          title: `Milestone Reached: ${caseData.title}`,
          message: `Funding reached ${milestone} of the target!`,
          data: {
            caseId,
            milestone,
            currentAmount,
            targetAmount,
          },
          caseId,
        })
      )

      await Promise.all(notificationPromises)
    } catch (error) {
      defaultLogger.error('Error creating progress milestone notification:', error)
    }
  }

  /**
   * Create a notification for new contribution
   */
  async createContributionNotification(
    caseId: string,
    contributionId: string,
    amount: number,
    donorName: string
  ) {
    try {
      const [caseData] = await db
        .select({
          id: cases.id,
          title: cases.title,
          created_by: cases.created_by,
        })
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!caseData) return

      // Notify case creator
      await this.createNotification({
        userId: caseData.created_by,
        type: 'case_contribution',
        title: `New Contribution: ${caseData.title}`,
        message: `${donorName} contributed ${amount}`,
        data: {
          caseId,
          contributionId,
          amount,
          donorName,
        },
        caseId,
      })
    } catch (error) {
      defaultLogger.error('Error creating contribution notification:', error)
    }
  }

  /**
   * Get users who should be notified about case updates
   */
  private async getUsersToNotify(caseId: string): Promise<string[]> {
    try {
      // Get case creator
      const [caseData] = await db
        .select({
          created_by: cases.created_by,
        })
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!caseData) return []

      const usersToNotify = [caseData.created_by]

      // TODO: Add logic to get contributors and followers
      // For now, just notify the case creator

      return usersToNotify
    } catch (error) {
      defaultLogger.error('Error getting users to notify:', error)
      return []
    }
  }

  /**
   * Create a notification
   */
  private async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      await db.insert(notifications).values({
        recipient_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        read: false,
      })
    } catch (error) {
      defaultLogger.error('Error creating notification:', error)
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<CaseNotification[]> {
    try {
      const results = await db
        .select({
          id: notifications.id,
          userId: notifications.recipient_id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          data: notifications.data,
          isRead: notifications.read,
          createdAt: notifications.created_at,
        })
        .from(notifications)
        .where(eq(notifications.recipient_id, userId))
        .orderBy(desc(notifications.created_at))
        .limit(limit)

      return results.map(result => {
        const parsedData = result.data
          ? (typeof result.data === 'string' ? JSON.parse(result.data) : result.data)
          : undefined
        const normalizedType = (result.type as CaseNotification['type'])
        const normalizedCreatedAt = result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt as any)
        return {
          id: result.id,
          userId: result.userId,
          type: normalizedType,
          title: result.title,
          message: result.message,
          data: parsedData,
          isRead: result.isRead,
          createdAt: normalizedCreatedAt,
          caseId: parsedData?.caseId,
        }
      })
    } catch (error) {
      defaultLogger.error('Error getting user notifications:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const [updated] = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .returning()

      return !!updated
    } catch (error) {
      defaultLogger.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.recipient_id, userId))

      return true
    } catch (error) {
      defaultLogger.error('Error marking all notifications as read:', error)
      return false
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const results = await db
        .select({ count: notifications.id })
        .from(notifications)
        .where(and(
          eq(notifications.recipient_id, userId),
          eq(notifications.read, false)
        ))

      return results.length
    } catch (error) {
      defaultLogger.error('Error getting unread count:', error)
      return 0
    }
  }
}

export const caseNotificationService = new CaseNotificationService() 