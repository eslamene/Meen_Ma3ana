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
  },
  // Closed -> Published (reopen case by admin)
  {
    from: 'closed',
    to: 'published',
    allowedRoles: ['admin'],
    requiresReason: true,
    systemAllowed: false
  },
  // Closed -> Under Review (by admin)
  {
    from: 'closed',
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
      // Get current case status from database FIRST (always get actual status)
      const [currentCase] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))

      if (!currentCase) {
        return { success: false, error: 'Case not found' }
      }
      
      // Get the ACTUAL current status from database (not from request)
      const actualCurrentStatus = currentCase.status
      
      // Normalize UI statuses to database statuses
      // UI might send: "active", "completed", "cancelled"
      // Database has: "draft", "submitted", "published", "closed", "under_review"
      const statusMapping: Record<string, string> = {
        'completed': 'closed',
        'cancelled': 'closed',
        'active': 'published', // "active" likely means published/active case
      }
      
      // Normalize new status from UI to database status
      const normalizedStatus = statusMapping[newStatus] || newStatus
      
      // Normalize current status if needed (shouldn't be necessary if DB is correct, but handle edge cases)
      const normalizedCurrentStatus = statusMapping[actualCurrentStatus] || actualCurrentStatus

      // Get user role if provided
      let userRole: string | undefined
      if (changedBy) {
        const [user] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, changedBy))
        userRole = user?.role
      }

      // Validate transition (using normalized statuses)
      if (!this.isTransitionAllowed(
        normalizedCurrentStatus as CaseStatus,
        normalizedStatus as CaseStatus,
        userRole,
        systemTriggered
      )) {
        return { success: false, error: 'Invalid status transition' }
      }

      // Check if reason is required (using normalized statuses)
      if (this.requiresReason(normalizedCurrentStatus as CaseStatus, normalizedStatus as CaseStatus) && !changeReason) {
        return { success: false, error: 'Reason is required for this status change' }
      }

      // Update case status (using normalized status)
      await db
        .update(cases)
        .set({
          status: normalizedStatus as CaseStatus,
          updated_at: new Date()
        })
        .where(eq(cases.id, caseId))

      // Record status change in history (store normalized statuses)
      await db.insert(caseStatusHistory).values({
        case_id: caseId,
        previous_status: normalizedCurrentStatus as CaseStatus,
        new_status: normalizedStatus as CaseStatus,
        changed_by: changedBy,
        system_triggered: systemTriggered,
        change_reason: changeReason
      })

      // Create case update for status change (use normalized statuses)
      try {
        const statusUpdateInfo = this.getStatusUpdateInfo(
          normalizedCurrentStatus as CaseStatus,
          normalizedStatus as CaseStatus,
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

      // Send push notifications based on notification rules
      defaultLogger.info('Checking notification rules for status change', {
        caseId,
        originalStatus: newStatus,
        normalizedStatus,
        oldStatus: normalizedCurrentStatus,
      })
      
      try {
        // Import notification services
        const { fcmNotificationService } = await import('@/lib/notifications/fcm-notifications')
        const { caseNotificationService } = await import('@/lib/notifications/case-notifications')
        const { NotificationRulesService } = await import('@/lib/notifications/notification-rules')
        
        const caseTitle = currentCase.title_en || currentCase.title_ar || 'Untitled'
        const caseTitleAr = currentCase.title_ar || currentCase.title_en || undefined
        
        // Get user role for context
        let userRole: string | undefined
        if (changedBy) {
          const [user] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, changedBy))
          userRole = user?.role
        }
        
        // Check for matching notification rules using new dynamic system
        const matchingRules = await NotificationRulesService.getMatchingRules('field_changed', {
          field: 'status',
          fromValue: normalizedCurrentStatus,
          toValue: normalizedStatus,
          caseData: currentCase,
          userRole,
          userId: changedBy,
        })
        
        // Also check for case_created event if status changed to published
        if (normalizedStatus === 'published') {
          const createdRules = await NotificationRulesService.getMatchingRules('case_created', {
            caseData: currentCase,
            userRole,
            userId: changedBy,
          })
          matchingRules.push(...createdRules)
        }
        
        if (matchingRules.length === 0) {
          defaultLogger.info('No matching notification rules found, skipping notification', {
            caseId,
            statusFrom: normalizedCurrentStatus,
            statusTo: normalizedStatus,
          })
        } else {
          defaultLogger.info('Found matching notification rules', {
            caseId,
            ruleCount: matchingRules.length,
            ruleIds: matchingRules.map(r => r.id),
          })
          
          // Process each matching rule
          for (const rule of matchingRules) {
            const targets = NotificationRulesService.getNotificationTargets(rule)
            
            if (targets.notifyAllUsers) {
              // Broadcast to all users
              if (normalizedStatus === 'published') {
                await fcmNotificationService.notifyCaseCreated(caseId, caseTitle, caseTitleAr)
              } else if (normalizedStatus === 'closed') {
                await fcmNotificationService.notifyCaseCompleted(caseId, caseTitle, caseTitleAr)
              } else {
                // For other status changes, use status changed notification
                await fcmNotificationService.notifyCaseStatusChanged(
                  caseId,
                  caseTitle,
                  caseTitleAr,
                  normalizedCurrentStatus,
                  normalizedStatus,
                  currentCase.created_by,
                  [] // Empty array means notify all (handled by service)
                )
              }
            } else {
              // Get specific user IDs based on targets
              const allNotifyUserIds: string[] = []
              
              if (rule.targets.notifyCreator && currentCase.created_by) {
                allNotifyUserIds.push(currentCase.created_by)
              }
              
              if (rule.targets.notifyContributors) {
                const contributorUserIds = await caseNotificationService.getContributingUsers(caseId)
                allNotifyUserIds.push(...contributorUserIds)
              }
              
              if (rule.targets.notifyChangeInitiator && changedBy) {
                allNotifyUserIds.push(changedBy)
              }
              
              if (rule.targets.notifyAssignedTo && currentCase.assigned_to) {
                allNotifyUserIds.push(currentCase.assigned_to)
              }
              
              if (rule.targets.notifySpecificUsers) {
                allNotifyUserIds.push(...rule.targets.notifySpecificUsers)
              }
              
              // Remove duplicates
              const uniqueUserIds = [...new Set(allNotifyUserIds)].filter(
                (id): id is string => id !== null && id !== undefined
              )
              
              if (uniqueUserIds.length > 0) {
                await fcmNotificationService.notifyCaseStatusChanged(
                  caseId,
                  caseTitle,
                  caseTitleAr,
                  normalizedCurrentStatus,
                  normalizedStatus,
                  currentCase.created_by,
                  uniqueUserIds
                )
              }
            }
          }
        }
        
        defaultLogger.info('FCM notification sent successfully', { caseId, originalStatus: newStatus, normalizedStatus })
      } catch (pushError) {
        // Log detailed error information
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError)
        const errorStack = pushError instanceof Error ? pushError.stack : undefined
        defaultLogger.error('Error sending FCM notifications for status change:', {
          error: pushError,
          caseId,
          originalStatus: newStatus,
          normalizedStatus,
          message: errorMessage,
          stack: errorStack,
          errorType: pushError instanceof Error ? pushError.constructor.name : typeof pushError,
        })
        // Don't fail the status change if push notification fails
      }

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