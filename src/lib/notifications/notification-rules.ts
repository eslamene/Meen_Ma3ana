/**
 * Dynamic Notification Rules Configuration
 * Allows admins to create custom notification rules based on case field changes
 */

import { db } from '@/lib/db'
import { systemConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { defaultLogger as logger } from '@/lib/logger'

export type FieldChangeType = 'status' | 'priority' | 'type' | 'category' | 'activity' | 'custom'

export interface FieldCondition {
  field: FieldChangeType
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'changed' | 'changed_from' | 'changed_to'
  value?: string | string[] // For 'equals', 'not_equals', 'in', 'not_in'
  fromValue?: string | string[] // For 'changed_from'
  toValue?: string | string[] // For 'changed_to'
}

export interface NotificationRule {
  id: string // Unique rule ID
  name: string // Display name
  description?: string // Rule description
  enabled: boolean
  trigger: {
    event: 'field_changed' | 'case_created' | 'case_updated' | 'activity_created' | 'custom'
    field?: FieldChangeType // For field_changed
    conditions?: FieldCondition[] // Multiple conditions (AND logic)
  }
  targets: {
    notifyAllUsers?: boolean
    notifyCreator?: boolean
    notifyContributors?: boolean
    notifyChangeInitiator?: boolean
    notifyAssignedTo?: boolean
    notifySpecificRoles?: string[] // e.g., ['admin', 'moderator']
    notifySpecificUsers?: string[] // User IDs
  }
  notification?: {
    title?: string // Custom title template
    body?: string // Custom body template
    icon?: string
    tag?: string
  }
  createdAt?: string
  updatedAt?: string
}

export class NotificationRulesService {
  private static rulesCache: NotificationRule[] | null = null
  private static cacheTimestamp: number = 0
  private static CACHE_TTL = 60000 // 1 minute

  /**
   * Get all notification rules
   */
  static async getAllRules(): Promise<NotificationRule[]> {
    // Check cache
    const now = Date.now()
    if (
      this.rulesCache &&
      now - this.cacheTimestamp < this.CACHE_TTL
    ) {
      return this.rulesCache
    }

    try {
      // Fetch rules from system_config
      const configs = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.groupType, 'notification_rules'))
        .orderBy(systemConfig.configKey)

      const rules: NotificationRule[] = []

      // Parse rules from config
      for (const config of configs) {
        try {
          const rule = JSON.parse(config.configValue) as NotificationRule
          if (rule.id && rule.name) {
            rules.push(rule)
          }
        } catch (error) {
          logger.warn('Failed to parse notification rule from config', {
            configKey: config.configKey,
            error,
          })
        }
      }

      // Update cache
      this.rulesCache = rules
      this.cacheTimestamp = now

      return rules
    } catch (error) {
      logger.error('Error fetching notification rules:', error)
      return []
    }
  }

  /**
   * Get a specific rule by ID
   */
  static async getRule(ruleId: string): Promise<NotificationRule | null> {
    const rules = await this.getAllRules()
    return rules.find(r => r.id === ruleId) || null
  }

  /**
   * Get enabled rules that match a specific event
   */
  static async getMatchingRules(
    event: 'field_changed' | 'case_created' | 'case_updated' | 'activity_created' | 'custom',
    context: {
      field?: FieldChangeType
      fromValue?: string
      toValue?: string
      caseData?: Record<string, any>
      userRole?: string
      userId?: string
    }
  ): Promise<NotificationRule[]> {
    const allRules = await this.getAllRules()
    const matchingRules: NotificationRule[] = []

    for (const rule of allRules) {
      if (!rule.enabled || rule.trigger.event !== event) {
        continue
      }

      // Check if field matches (for field_changed events)
      if (event === 'field_changed' && rule.trigger.field) {
        if (rule.trigger.field !== context.field) {
          continue
        }
      }

      // Evaluate conditions
      if (rule.trigger.conditions && rule.trigger.conditions.length > 0) {
        let allConditionsMet = true

        for (const condition of rule.trigger.conditions) {
          if (!this.evaluateCondition(condition, context)) {
            allConditionsMet = false
            break
          }
        }

        if (!allConditionsMet) {
          continue
        }
      }

      matchingRules.push(rule)
    }

    return matchingRules
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: FieldCondition,
    context: {
      fromValue?: string
      toValue?: string
      caseData?: Record<string, any>
      userRole?: string
      userId?: string
    }
  ): boolean {
    switch (condition.operator) {
      case 'equals':
        if (condition.value === undefined) return false
        return context.toValue === condition.value

      case 'not_equals':
        if (condition.value === undefined) return false
        return context.toValue !== condition.value

      case 'in':
        if (!Array.isArray(condition.value) || condition.value.length === 0) return false
        return condition.value.includes(context.toValue || '')

      case 'not_in':
        if (!Array.isArray(condition.value) || condition.value.length === 0) return true
        return !condition.value.includes(context.toValue || '')

      case 'changed':
        return context.fromValue !== context.toValue

      case 'changed_from':
        if (!Array.isArray(condition.fromValue)) {
          return context.fromValue === condition.fromValue
        }
        return condition.fromValue.includes(context.fromValue || '')

      case 'changed_to':
        if (!Array.isArray(condition.toValue)) {
          return context.toValue === condition.toValue
        }
        return condition.toValue.includes(context.toValue || '')

      default:
        return false
    }
  }

  /**
   * Get notification targets for a rule
   */
  static getNotificationTargets(rule: NotificationRule): {
    userIds: string[]
    notifyAllUsers: boolean
  } {
    const userIds: string[] = []

    if (rule.targets.notifyAllUsers) {
      return { userIds: [], notifyAllUsers: true }
    }

    // Collect specific user IDs
    if (rule.targets.notifySpecificUsers) {
      userIds.push(...rule.targets.notifySpecificUsers)
    }

    return { userIds, notifyAllUsers: false }
  }

  /**
   * Invalidate cache (call after updating rules)
   */
  static invalidateCache(): void {
    this.rulesCache = null
    this.cacheTimestamp = 0
  }
}
