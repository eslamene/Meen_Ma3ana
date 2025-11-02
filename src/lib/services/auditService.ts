import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { defaultLogger } from '@/lib/logger'

export interface AuditLogEntry {
  id?: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

/**
 * Audit service for logging security-related actions
 */
export class AuditService {
  /**
   * Log an audit entry to the security_audit_log table
   */
  static async logAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO rbac_audit_log (
          user_id,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          ip_address,
          user_agent,
          created_at
        ) VALUES (
          ${userId},
          ${action},
          ${resourceType},
          ${resourceId || null},
          ${null},
          ${details ? JSON.stringify(details) : null},
          ${ipAddress || null},
          ${userAgent || null},
          NOW()
        )
      `)
    } catch (error) {
      defaultLogger.error('Error logging audit action:', error)
      // Don't throw error for audit failures to avoid breaking main functionality
    }
  }

  /**
   * Log RBAC-related actions
   */
  static async logRBACAction(
    userId: string,
    action: string,
    targetUserId?: string,
    roleId?: string,
    permissionId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const auditDetails = {
      ...details,
      targetUserId,
      roleId,
      permissionId
    }

    await this.logAction(
      userId,
      action,
      'rbac',
      undefined,
      auditDetails,
      ipAddress,
      userAgent
    )
  }

  /**
   * Log user management actions
   */
  static async logUserAction(
    userId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const auditDetails = {
      ...details,
      targetUserId
    }

    await this.logAction(
      userId,
      action,
      'user',
      targetUserId,
      auditDetails,
      ipAddress,
      userAgent
    )
  }

  /**
   * Log admin actions
   */
  static async logAdminAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    )
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          user_id,
          action,
          table_name as resource_type,
          record_id as resource_id,
          new_values as details,
          ip_address,
          user_agent,
          created_at
        FROM rbac_audit_log
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)

      return result.rows as AuditLogEntry[]
    } catch (error) {
      defaultLogger.error('Error getting user audit logs:', error)
      return []
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          user_id,
          action,
          table_name as resource_type,
          record_id as resource_id,
          new_values as details,
          ip_address,
          user_agent,
          created_at
        FROM rbac_audit_log
        WHERE table_name = ${resourceType}
          AND record_id = ${resourceId}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)

      return result.rows as AuditLogEntry[]
    } catch (error) {
      defaultLogger.error('Error getting resource audit logs:', error)
      return []
    }
  }

  /**
   * Get recent audit logs (admin only)
   */
  static async getRecentAuditLogs(
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          user_id,
          action,
          table_name as resource_type,
          record_id as resource_id,
          new_values as details,
          ip_address,
          user_agent,
          created_at
        FROM rbac_audit_log
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)

      return result.rows as AuditLogEntry[]
    } catch (error) {
      defaultLogger.error('Error getting recent audit logs:', error)
      return []
    }
  }
}

/**
 * Helper function to extract IP address and user agent from request
 */
export const auditService = AuditService

export function extractRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('cf-connecting-ip') ||
                   undefined

  const userAgent = request.headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}