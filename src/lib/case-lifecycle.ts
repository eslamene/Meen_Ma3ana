import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cases, caseStatusHistory, users } from '@/drizzle/schema'
import { NotificationService } from '@/lib/notifications'
import { caseUpdateService } from '@/lib/case-updates'
import type { CaseStatus } from '@/drizzle/schema'

import { defaultLogger } from '@/lib/logger'

export interface StatusTransition {
  from: CaseStatus
  to: CaseStatus
  allowedRoles: string[]
  requiresReason: boolean
  systemAllowed: boolean
}

export interface StatusChangeParams {
  caseId: string
  newStatus: CaseStatus
  changedBy?: string
  systemTriggered?: boolean
  changeReason?: string
}

// Define allowed status transitions
const STATUS_TRANSITIONS: StatusTransition[] = [
  // Draft -> Submitted (by case creator)
  {
    from: 'draft',
    to: 'submitted',
    allowedRoles: ['donor', 'sponsor', 'admin'],
    requiresReason: false,
    systemAllowed: false
  },
  // Submitted -> Published (by admin)
  {
    from: 'submitted',
    to: 'published',
    allowedRoles: ['admin'],
    requiresReason: false,
    systemAllowed: false
  },
  // Submitted -> Under Review (by admin)
  {
    from: 'submitted',
    to: 'under_review',
    allowedRoles: ['admin'],
    requiresReason: true,
    systemAllowed: false
  },
  // Under Review -> Published (by admin)
  {
    from: 'under_review',
    to: 'published',
    allowedRoles: ['admin'],
    requiresReason: false,
    systemAllowed: false
  },
  // Under Review -> Closed (by admin)
  {
    from: 'under_review',
    to: 'closed',
    allowedRoles: ['admin'],
    requiresReason: true,
    systemAllowed: false
  },
  // Published -> Closed (automatic or by admin)
  {
    from: 'published',
    to: 'closed',
    allowedRoles: ['admin'],
    requiresReason: false,
    systemAllowed: true
  },
  // Published -> Under Review (by admin)
  {
    from: 'published',
    to: 'under_review',
    allowedRoles: ['admin'],
    requiresReason: true,
    systemAllowed: false
  }
]

export class CaseLifecycleService {
  /**
   * Check if a status transition is allowed
   */
  static isTransitionAllowed(
    fromStatus: CaseStatus,
    toStatus: CaseStatus,
    userRole?: string,
    systemTriggered = false
  ): boolean {
    const transition = STATUS_TRANSITIONS.find(
      t => t.from === fromStatus && t.to === toStatus
    )

    if (!transition) {
      return false
    }

    // System-triggered transitions
    if (systemTriggered && transition.systemAllowed) {
      return true
    }

    // User-triggered transitions
    if (!userRole) {
      return false
    }

    return transition.allowedRoles.includes(userRole)
  }

  /**
   * Check if a transition requires a reason
   */
  static requiresReason(fromStatus: CaseStatus, toStatus: CaseStatus): boolean {
    const transition = STATUS_TRANSITIONS.find(
      t => t.from === fromStatus && t.to === toStatus
    )
    return transition?.requiresReason || false
  }

  /**
   * Change case status with validation and history tracking
   */
  static async changeCaseStatus(params: StatusChangeParams): Promise<{
    success: boolean
    error?: string
    case?: Record<string, unknown>
  }> {
    const { caseId, newStatus, changedBy, systemTriggered = false, changeReason } = params

    try {
      // Get current case
      const [currentCase] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!currentCase) {
        return { success: false, error: 'Case not found' }
      }

      // Get user role if provided
      let userRole: string | undefined
      if (changedBy) {
        const [user] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, changedBy))
        userRole = user?.role
      }

      // Validate transition
      if (!this.isTransitionAllowed(
        currentCase.status as CaseStatus,
        newStatus,
        userRole,
        systemTriggered
      )) {
        return { success: false, error: 'Invalid status transition' }
      }

      // Check if reason is required
      if (this.requiresReason(currentCase.status as CaseStatus, newStatus) && !changeReason) {
        return { success: false, error: 'Reason is required for this status change' }
      }

      // Update case status
      await db
        .update(cases)
        .set({
          status: newStatus,
          updated_at: new Date()
        })
        .where(eq(cases.id, caseId))

      // Record status change in history
      await db.insert(caseStatusHistory).values({
        case_id: caseId,
        previous_status: currentCase.status as CaseStatus,
        new_status: newStatus,
        changed_by: changedBy,
        system_triggered: systemTriggered,
        change_reason: changeReason
      })

      // Create case update for status change
      try {
        const statusUpdateInfo = this.getStatusUpdateInfo(
          currentCase.status as CaseStatus,
          newStatus,
          systemTriggered,
          changeReason
        )

        if (statusUpdateInfo) {
          await caseUpdateService.createUpdate({
            caseId,
            title: statusUpdateInfo.title,
            content: statusUpdateInfo.content,
            updateType: statusUpdateInfo.updateType,
            isPublic: statusUpdateInfo.isPublic,
            createdBy: changedBy || 'system',
          })
        }
      } catch (updateError) {
        defaultLogger.error('Error creating case update for status change:', updateError)
        // Don't fail the request if case update creation fails
      }

      // Get updated case
      const [updatedCase] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))

      // Send notifications
      await this.sendStatusChangeNotifications({
        caseId,
        caseTitle: currentCase.title,
        oldStatus: currentCase.status as CaseStatus,
        newStatus,
        changedBy,
        changeReason,
        systemTriggered
      })

      return { success: true, case: updatedCase }
    } catch (error) {
      defaultLogger.error('Error changing case status:', error)
      return { success: false, error: 'Failed to change case status' }
    }
  }

  /**
   * Get status update information for case updates
   */
  private static getStatusUpdateInfo(
    oldStatus: CaseStatus,
    newStatus: CaseStatus,
    systemTriggered: boolean,
    changeReason?: string
  ): { title: string; content: string; updateType: 'progress' | 'milestone' | 'general' | 'emergency'; isPublic: boolean } | null {
    const reasonText = changeReason ? ` Reason: ${changeReason}` : ''

    switch (newStatus) {
      case 'published':
        return {
          title: 'Case Published! 🎉',
          content: `This case has been published and is now accepting donations!${reasonText} Thank you for your patience during the review process.`,
          updateType: 'milestone',
          isPublic: true
        }
      
      case 'under_review':
        return {
          title: 'Case Under Review',
          content: `This case is currently under review by our team.${reasonText} We'll provide updates as soon as possible.`,
          updateType: 'general',
          isPublic: true
        }
      
      case 'closed':
        if (systemTriggered) {
          return {
            title: 'Case Successfully Completed! 🎉',
            content: `This case has been automatically closed as the funding goal has been reached! Thank you to everyone who contributed to making this possible.`,
            updateType: 'milestone',
            isPublic: true
          }
        } else {
          return {
            title: 'Case Closed',
            content: `This case has been closed.${reasonText} Thank you to everyone who supported this cause.`,
            updateType: 'general',
            isPublic: true
          }
        }
      
      case 'submitted':
        return {
          title: 'Case Submitted for Review',
          content: `This case has been submitted for review by our team. We'll review it and provide updates soon.`,
          updateType: 'progress',
          isPublic: false // Internal update
        }
      
      default:
        return null
    }
  }

  /**
   * Send notifications for status changes
   */
  private static async sendStatusChangeNotifications(data: {
    caseId: string
    caseTitle: string
    oldStatus: CaseStatus
    newStatus: CaseStatus
    changedBy?: string
    changeReason?: string
    systemTriggered: boolean
  }) {
    try {
      await NotificationService.sendStatusChangeNotifications(data)
    } catch (error) {
      defaultLogger.error('Error sending status change notifications:', error)
      // Don't fail the status change if notifications fail
    }
  }

  /**
   * Get case status history
   */
  static async getCaseStatusHistory(caseId: string) {
    try {
      const history = await db
        .select({
          id: caseStatusHistory.id,
          previousStatus: caseStatusHistory.previous_status,
          newStatus: caseStatusHistory.new_status,
          changedBy: caseStatusHistory.changed_by,
          systemTriggered: caseStatusHistory.system_triggered,
          changeReason: caseStatusHistory.change_reason,
          changedAt: caseStatusHistory.changed_at,
          changedByUser: {
            id: users.id,
            firstName: users.first_name,
            lastName: users.last_name,
            email: users.email
          }
        })
        .from(caseStatusHistory)
        .leftJoin(users, eq(caseStatusHistory.changed_by, users.id))
        .where(eq(caseStatusHistory.case_id, caseId))
        .orderBy(desc(caseStatusHistory.changed_at))

      return { success: true, history }
    } catch (error) {
      defaultLogger.error('Error getting case status history:', error)
      return { success: false, error: 'Failed to get case status history' }
    }
  }

  /**
   * Get all cases by status
   */
  static async getCasesByStatus(status: CaseStatus) {
    try {
      const casesList = await db
        .select()
        .from(cases)
        .where(eq(cases.status, status))

      return { success: true, cases: casesList }
    } catch (error) {
      defaultLogger.error('Error getting cases by status:', error)
      return { success: false, error: 'Failed to get cases by status' }
    }
  }

  /**
   * Check if case is fully funded
   */
  static isCaseFullyFunded(caseData: { currentAmount?: string; targetAmount?: string }): boolean {
    const currentAmount = parseFloat(caseData.currentAmount || '0')
    const targetAmount = parseFloat(caseData.targetAmount || '0')
    return currentAmount >= targetAmount
  }

  /**
   * Get available status transitions for a case
   */
  static getAvailableTransitions(
    currentStatus: CaseStatus,
    userRole?: string,
    systemTriggered = false
  ): CaseStatus[] {
    return STATUS_TRANSITIONS
      .filter(t => t.from === currentStatus)
      .filter(t => {
        if (systemTriggered) {
          return t.systemAllowed
        }
        if (!userRole) {
          return false
        }
        return t.allowedRoles.includes(userRole)
      })
      .map(t => t.to)
  }
} 