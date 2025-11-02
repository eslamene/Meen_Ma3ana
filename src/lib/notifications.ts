import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/db'
import { cases, users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import type { CaseStatus } from '@/drizzle/schema'

import { defaultLogger } from '@/lib/logger'

export interface NotificationTemplate {
  subject: string
  body: string
  inAppMessage: string
}

export interface NotificationData {
  caseId: string
  caseTitle: string
  oldStatus: CaseStatus
  newStatus: CaseStatus
  changedBy?: string
  changeReason?: string
  systemTriggered: boolean
}

export class NotificationService {
  /**
   * Send notifications for case status changes
   */
  static async sendStatusChangeNotifications(data: NotificationData) {
    try {
      // Get case details
      const [caseData] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, data.caseId))

      if (!caseData) {
        defaultLogger.error('Case not found for notification:', data.caseId)
        return
      }

      // Get case creator
      const [creator] = await db
        .select()
        .from(users)
        .where(eq(users.id, caseData.createdBy))

      // Get user who made the change
      let changedByUser = null
      if (data.changedBy) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, data.changedBy))
        changedByUser = user
      }

      // Create notification template
      const template = this.getStatusChangeTemplate(data, caseData, creator, changedByUser)

      // Send notifications
      await Promise.all([
        this.sendEmailNotification(creator?.email, template),
        this.sendInAppNotification(caseData.createdBy, template),
        this.sendWebhookNotification(data, template)
      ])

      defaultLogger.info(`Notifications sent for case ${data.caseId} status change`)
    } catch (error) {
      defaultLogger.error('Error sending status change notifications:', error)
    }
  }

  /**
   * Get notification template based on status change
   */
  static getStatusChangeTemplate(
    data: NotificationData,
    caseData: any,
    creator: any,
    changedByUser: any
  ): NotificationTemplate {
    const statusLabels = {
      draft: 'Draft',
      submitted: 'Submitted',
      published: 'Published',
      closed: 'Closed',
      under_review: 'Under Review'
    }

    const oldStatusLabel = statusLabels[data.oldStatus] || data.oldStatus
    const newStatusLabel = statusLabels[data.newStatus] || data.newStatus

    let subject = ''
    let body = ''
    let inAppMessage = ''

    switch (data.newStatus) {
      case 'published':
        subject = `Your case "${data.caseTitle}" has been published!`
        body = `
          <h2>Great news! Your case has been published.</h2>
          <p>Your case "${data.caseTitle}" is now live and visible to potential donors.</p>
          <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>
          ${data.changeReason ? `<p><strong>Reason:</strong> ${data.changeReason}</p>` : ''}
          <p>You can now start receiving donations for your case.</p>
        `
        inAppMessage = `Your case "${data.caseTitle}" has been published and is now live!`
        break

      case 'closed':
        subject = `Your case "${data.caseTitle}" has been closed`
        body = `
          <h2>Case Status Update</h2>
          <p>Your case "${data.caseTitle}" has been closed.</p>
          <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>
          ${data.changeReason ? `<p><strong>Reason:</strong> ${data.changeReason}</p>` : ''}
          <p>If you have any questions, please contact our support team.</p>
        `
        inAppMessage = `Your case "${data.caseTitle}" has been closed.`
        break

      case 'under_review':
        subject = `Your case "${data.caseTitle}" is under review`
        body = `
          <h2>Case Under Review</h2>
          <p>Your case "${data.caseTitle}" is currently under review by our team.</p>
          <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>
          ${data.changeReason ? `<p><strong>Reason:</strong> ${data.changeReason}</p>` : ''}
          <p>We will notify you once the review is complete.</p>
        `
        inAppMessage = `Your case "${data.caseTitle}" is under review.`
        break

      case 'submitted':
        subject = `Your case "${data.caseTitle}" has been submitted for review`
        body = `
          <h2>Case Submitted</h2>
          <p>Your case "${data.caseTitle}" has been submitted for review.</p>
          <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>
          <p>Our team will review your case and get back to you soon.</p>
        `
        inAppMessage = `Your case "${data.caseTitle}" has been submitted for review.`
        break

      default:
        subject = `Case status updated: "${data.caseTitle}"`
        body = `
          <h2>Case Status Update</h2>
          <p>Your case "${data.caseTitle}" status has been updated.</p>
          <p><strong>Status:</strong> ${oldStatusLabel} → ${newStatusLabel}</p>
          ${data.changeReason ? `<p><strong>Reason:</strong> ${data.changeReason}</p>` : ''}
        `
        inAppMessage = `Your case "${data.caseTitle}" status has been updated to ${newStatusLabel}.`
    }

    return { subject, body, inAppMessage }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(email: string | null, template: NotificationTemplate) {
    if (!email) return

    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      defaultLogger.info('Email notification would be sent to:', email)
      defaultLogger.info('Subject:', template.subject)
      defaultLogger.info('Body:', template.body)
      
      // For now, just log the email notification
      // In production, you would integrate with an email service
    } catch (error) {
      defaultLogger.error('Error sending email notification:', error)
    }
  }

  /**
   * Send in-app notification
   */
  static async sendInAppNotification(userId: string, template: NotificationTemplate) {
    try {
      const supabase = createClient()
      
      // Insert notification into database
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: template.subject,
          message: template.inAppMessage,
          type: 'case_status_change',
          read: false
          // created_at will be set automatically by the database DEFAULT NOW()
        })

      if (error) {
        defaultLogger.error('Error creating in-app notification:', error)
      }
    } catch (error) {
      defaultLogger.error('Error sending in-app notification:', error)
    }
  }

  /**
   * Send webhook notification
   */
  static async sendWebhookNotification(data: NotificationData, template: NotificationTemplate) {
    try {
      // TODO: Send webhook to configured endpoints
      defaultLogger.info('Webhook notification would be sent:', {
        event: 'case_status_change',
        data,
        template
      })
    } catch (error) {
      defaultLogger.error('Error sending webhook notification:', error)
    }
  }

  /**
   * Send automatic closure notification
   */
  static async sendAutomaticClosureNotification(caseId: string, caseTitle: string, fundingAmount: string) {
    try {
      const template: NotificationTemplate = {
        subject: `Case "${caseTitle}" automatically closed - funding goal reached!`,
        body: `
          <h2>Case Successfully Funded!</h2>
          <p>Your case "${caseTitle}" has been automatically closed because the funding goal has been reached.</p>
          <p><strong>Total Funding:</strong> ${fundingAmount}</p>
          <p>Congratulations! Your case has been successfully funded.</p>
        `,
        inAppMessage: `Your case "${caseTitle}" has been automatically closed - funding goal reached!`
      }

      // Get case creator
      const [caseData] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))

      if (caseData) {
        const [creator] = await db
          .select()
          .from(users)
          .where(eq(users.id, caseData.createdBy))

        await Promise.all([
          this.sendEmailNotification(creator?.email, template),
          this.sendInAppNotification(caseData.createdBy, template)
        ])
      }
    } catch (error) {
      defaultLogger.error('Error sending automatic closure notification:', error)
    }
  }

  /**
   * Send deadline reminder notification
   */
  static async sendDeadlineReminderNotification(caseId: string, caseTitle: string, daysLeft: number) {
    try {
      const template: NotificationTemplate = {
        subject: `Reminder: Case "${caseTitle}" deadline approaching`,
        body: `
          <h2>Deadline Reminder</h2>
          <p>Your case "${caseTitle}" deadline is approaching in ${daysLeft} days.</p>
          <p>Consider sharing your case more widely to reach your funding goal.</p>
        `,
        inAppMessage: `Your case "${caseTitle}" deadline is approaching in ${daysLeft} days.`
      }

      // Get case creator
      const [caseData] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))

      if (caseData) {
        const [creator] = await db
          .select()
          .from(users)
          .where(eq(users.id, caseData.createdBy))

        await Promise.all([
          this.sendEmailNotification(creator?.email, template),
          this.sendInAppNotification(caseData.createdBy, template)
        ])
      }
    } catch (error) {
      defaultLogger.error('Error sending deadline reminder notification:', error)
    }
  }
} 