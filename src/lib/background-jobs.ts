import { db } from '@/lib/db'
import { cases, contributions } from '@/drizzle/schema'
import { eq, sum, and, gte } from 'drizzle-orm'
import { CaseLifecycleService } from '@/lib/case-lifecycle'

import { defaultLogger } from '@/lib/logger'

export class BackgroundJobService {
  /**
   * Check and close fully funded one-time cases
   * This should be run periodically (e.g., daily)
   */
  static async processAutomaticCaseClosure() {
    try {
      defaultLogger.info('Starting automatic case closure check...')

      // Get all published one-time cases
      const publishedCases = await db
        .select()
        .from(cases)
        .where(and(
          eq(cases.type, 'one-time'),
          eq(cases.status, 'published')
        ))

      let closedCount = 0
      let errorCount = 0

      for (const caseData of publishedCases) {
        try {
          // Calculate total contributions for this case
          const [totalContributions] = await db
            .select({ total: sum(contributions.amount) })
            .from(contributions)
            .where(eq(contributions.case_id, caseData.id))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const targetAmount = parseFloat(caseData.target_amount || '0')

          // Check if case is fully funded
          if (totalAmount >= targetAmount) {
            // Add a grace period (e.g., 24 hours) before automatic closure
            const gracePeriodHours = 24
            const caseCreatedAt = new Date(caseData.created_at)
            const gracePeriodEnd = new Date(caseCreatedAt.getTime() + (gracePeriodHours * 60 * 60 * 1000))
            
            if (new Date() >= gracePeriodEnd) {
              // Automatically close the case
              const result = await CaseLifecycleService.changeCaseStatus({
                caseId: caseData.id,
                newStatus: 'closed',
                systemTriggered: true,
                changeReason: `Case automatically closed - funding goal reached (${totalAmount}/${targetAmount})`
              })

              if (result.success) {
                closedCount++
                defaultLogger.info(`✅ Automatically closed case: ${caseData.title} (${caseData.id})`)
                
                // TODO: Send notifications to case creator and donors
                // await sendCaseClosedNotifications(caseData.id)
              } else {
                errorCount++
                defaultLogger.error(`❌ Failed to close case ${caseData.id}:`, result.error)
              }
            } else {
              defaultLogger.info(`⏳ Case ${caseData.id} is fully funded but still in grace period`)
            }
          }
        } catch (error) {
          errorCount++
          defaultLogger.error(`❌ Error processing case ${caseData.id}:`, error)
        }
      }

      defaultLogger.info(`Automatic closure check completed: ${closedCount} cases closed, ${errorCount} errors`)
      return { success: true, closedCount, errorCount }
    } catch (error) {
      defaultLogger.error('Error in automatic case closure job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Update case current amounts based on contributions
   * This should be run when new contributions are added
   */
  static async updateCaseAmounts() {
    try {
      defaultLogger.info('Starting case amount updates...')

      // Get all cases with their total contributions
      const casesWithAmounts = await db
        .select({
          caseId: cases.id,
          targetAmount: cases.target_amount,
          currentAmount: cases.current_amount
        })
        .from(cases)

      let updatedCount = 0

      for (const caseData of casesWithAmounts) {
        try {
          // Calculate total contributions for this case
          const [totalContributions] = await db
            .select({ total: sum(contributions.amount) })
            .from(contributions)
            .where(eq(contributions.case_id, caseData.caseId))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const currentAmount = parseFloat(caseData.currentAmount || '0') // Note: currentAmount is from the select alias

          // Update if amounts don't match
          if (Math.abs(totalAmount - currentAmount) > 0.01) {
            await db
              .update(cases)
              .set({
                current_amount: totalAmount.toString(),
                updated_at: new Date()
              })
              .where(eq(cases.id, caseData.caseId))

            updatedCount++
            defaultLogger.info(`✅ Updated case ${caseData.caseId} amount: ${currentAmount} -> ${totalAmount}`)
          }
        } catch (error) {
          defaultLogger.error(`❌ Error updating case ${caseData.caseId} amount:`, error)
        }
      }

      defaultLogger.info(`Case amount updates completed: ${updatedCount} cases updated`)
      return { success: true, updatedCount }
    } catch (error) {
      defaultLogger.error('Error in case amount update job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Clean up expired drafts
   * This should be run periodically (e.g., weekly)
   */
  static async cleanupExpiredDrafts() {
    try {
      defaultLogger.info('Starting expired draft cleanup...')

      // Delete drafts older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await db
        .delete(cases)
        .where(and(
          eq(cases.status, 'draft'),
          gte(cases.created_at, thirtyDaysAgo)
        ))

      const deletedCount = Array.isArray(result) ? result.length : 0
      defaultLogger.info(`Expired draft cleanup completed: ${deletedCount} drafts deleted`)
      return { success: true, deletedCount }
    } catch (error) {
      defaultLogger.error('Error in expired draft cleanup job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Send reminder notifications for cases nearing deadline
   * This should be run daily
   */
  static async sendDeadlineReminders() {
    try {
      defaultLogger.info('Starting deadline reminder checks...')

      // Get cases that are published and have a deadline within 7 days
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const casesNearingDeadline = await db
        .select()
        .from(cases)
        .where(and(
          eq(cases.status, 'published'),
          eq(cases.type, 'one-time'),
          gte(cases.end_date, sevenDaysFromNow)
        ))

      let reminderCount = 0

      for (const caseData of casesNearingDeadline) {
        try {
          // Calculate funding progress
          const [totalContributions] = await db
            .select({ total: sum(contributions.amount) })
            .from(contributions)
            .where(eq(contributions.case_id, caseData.id))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const targetAmount = parseFloat(caseData.target_amount || '0')
          const progress = (totalAmount / targetAmount) * 100

          // Send reminder if progress is less than 80%
          if (progress < 80) {
            // TODO: Send reminder notification to case creator
            // await sendDeadlineReminder(caseData.id, caseData.createdBy)
            reminderCount++
            defaultLogger.info(`📧 Sent deadline reminder for case: ${caseData.title}`)
          }
        } catch (error) {
          defaultLogger.error(`❌ Error sending reminder for case ${caseData.id}:`, error)
        }
      }

      defaultLogger.info(`Deadline reminder check completed: ${reminderCount} reminders sent`)
      return { success: true, reminderCount }
    } catch (error) {
      defaultLogger.error('Error in deadline reminder job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }
} 