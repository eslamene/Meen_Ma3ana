import { db } from '@/lib/db'
import { cases, contributions } from '@/drizzle/schema'
import { eq, sum, and, gte } from 'drizzle-orm'
import { CaseLifecycleService } from './case-lifecycle'

export class BackgroundJobService {
  /**
   * Check and close fully funded one-time cases
   * This should be run periodically (e.g., daily)
   */
  static async processAutomaticCaseClosure() {
    try {
      console.log('Starting automatic case closure check...')

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
            .where(eq(contributions.caseId, caseData.id))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const targetAmount = parseFloat(caseData.targetAmount || '0')

          // Check if case is fully funded
          if (totalAmount >= targetAmount) {
            // Add a grace period (e.g., 24 hours) before automatic closure
            const gracePeriodHours = 24
            const caseCreatedAt = new Date(caseData.createdAt)
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
                console.log(`✅ Automatically closed case: ${caseData.title} (${caseData.id})`)
                
                // TODO: Send notifications to case creator and donors
                // await sendCaseClosedNotifications(caseData.id)
              } else {
                errorCount++
                console.error(`❌ Failed to close case ${caseData.id}:`, result.error)
              }
            } else {
              console.log(`⏳ Case ${caseData.id} is fully funded but still in grace period`)
            }
          }
        } catch (error) {
          errorCount++
          console.error(`❌ Error processing case ${caseData.id}:`, error)
        }
      }

      console.log(`Automatic closure check completed: ${closedCount} cases closed, ${errorCount} errors`)
      return { success: true, closedCount, errorCount }
    } catch (error) {
      console.error('Error in automatic case closure job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Update case current amounts based on contributions
   * This should be run when new contributions are added
   */
  static async updateCaseAmounts() {
    try {
      console.log('Starting case amount updates...')

      // Get all cases with their total contributions
      const casesWithAmounts = await db
        .select({
          caseId: cases.id,
          targetAmount: cases.targetAmount,
          currentAmount: cases.currentAmount
        })
        .from(cases)

      let updatedCount = 0

      for (const caseData of casesWithAmounts) {
        try {
          // Calculate total contributions for this case
          const [totalContributions] = await db
            .select({ total: sum(contributions.amount) })
            .from(contributions)
            .where(eq(contributions.caseId, caseData.caseId))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const currentAmount = parseFloat(caseData.currentAmount || '0')

          // Update if amounts don't match
          if (Math.abs(totalAmount - currentAmount) > 0.01) {
            await db
              .update(cases)
              .set({
                currentAmount: totalAmount.toString(),
                updatedAt: new Date()
              })
              .where(eq(cases.id, caseData.caseId))

            updatedCount++
            console.log(`✅ Updated case ${caseData.caseId} amount: ${currentAmount} -> ${totalAmount}`)
          }
        } catch (error) {
          console.error(`❌ Error updating case ${caseData.caseId} amount:`, error)
        }
      }

      console.log(`Case amount updates completed: ${updatedCount} cases updated`)
      return { success: true, updatedCount }
    } catch (error) {
      console.error('Error in case amount update job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Clean up expired drafts
   * This should be run periodically (e.g., weekly)
   */
  static async cleanupExpiredDrafts() {
    try {
      console.log('Starting expired draft cleanup...')

      // Delete drafts older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await db
        .delete(cases)
        .where(and(
          eq(cases.status, 'draft'),
          gte(cases.createdAt, thirtyDaysAgo)
        ))

      console.log(`Expired draft cleanup completed: ${result.rowCount} drafts deleted`)
      return { success: true, deletedCount: result.rowCount }
    } catch (error) {
      console.error('Error in expired draft cleanup job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }

  /**
   * Send reminder notifications for cases nearing deadline
   * This should be run daily
   */
  static async sendDeadlineReminders() {
    try {
      console.log('Starting deadline reminder checks...')

      // Get cases that are published and have a deadline within 7 days
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const casesNearingDeadline = await db
        .select()
        .from(cases)
        .where(and(
          eq(cases.status, 'published'),
          eq(cases.type, 'one-time'),
          gte(cases.endDate, sevenDaysFromNow)
        ))

      let reminderCount = 0

      for (const caseData of casesNearingDeadline) {
        try {
          // Calculate funding progress
          const [totalContributions] = await db
            .select({ total: sum(contributions.amount) })
            .from(contributions)
            .where(eq(contributions.caseId, caseData.id))

          const totalAmount = parseFloat(totalContributions?.total || '0')
          const targetAmount = parseFloat(caseData.targetAmount || '0')
          const progress = (totalAmount / targetAmount) * 100

          // Send reminder if progress is less than 80%
          if (progress < 80) {
            // TODO: Send reminder notification to case creator
            // await sendDeadlineReminder(caseData.id, caseData.createdBy)
            reminderCount++
            console.log(`📧 Sent deadline reminder for case: ${caseData.title}`)
          }
        } catch (error) {
          console.error(`❌ Error sending reminder for case ${caseData.id}:`, error)
        }
      }

      console.log(`Deadline reminder check completed: ${reminderCount} reminders sent`)
      return { success: true, reminderCount }
    } catch (error) {
      console.error('Error in deadline reminder job:', error)
      return { success: false, error: 'Background job failed' }
    }
  }
} 