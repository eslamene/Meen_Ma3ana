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

      // Extract rows from drizzle result (handles both array and object with rows property)
      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []
      
      // Cast to AuditLogEntry[] - the SQL query returns columns matching AuditLogEntry structure
      return extractedRows as AuditLogEntry[]
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

      // Extract rows from drizzle result (handles both array and object with rows property)
      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []
      
      // Cast to AuditLogEntry[] - the SQL query returns columns matching AuditLogEntry structure
      return extractedRows as AuditLogEntry[]
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

      // Extract rows from drizzle result (handles both array and object with rows property)
      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []
      
      // Cast to AuditLogEntry[] - the SQL query returns columns matching AuditLogEntry structure
      return extractedRows as AuditLogEntry[]
    } catch (error) {
      defaultLogger.error('Error getting recent audit logs:', error)
      return []
    }
  }

  // Stub methods for useAuditLog hook compatibility
  // TODO: Implement these methods properly
  static async logChange(params: {
    user_id?: string
    action?: string
    table_name?: string
    record_id?: string
    details?: Record<string, unknown>
    new_values?: Record<string, unknown>
    old_values?: Record<string, unknown>
    session_id?: string
    request_id?: string
    severity?: 'info' | 'warning' | 'error' | 'critical'
    category?: string
    metadata?: Record<string, unknown>
  }): Promise<string | null> {
    defaultLogger.warn('logChange not implemented, using logAction')
    await this.logAction(
      params.user_id || 'system',
      params.action || 'change',
      params.table_name || 'unknown',
      params.record_id,
      params.details || params.new_values
    )
    return null
  }

  static async logRoleAssignment(params: {
    user_id?: string
    target_user_id?: string
    role_name?: string
    action?: 'assign' | 'revoke'
    session_id?: string
    request_id?: string
  }): Promise<string | null> {
    defaultLogger.warn('logRoleAssignment not implemented, using logRBACAction')
    await this.logRBACAction(
      params.user_id || 'system',
      params.action || 'assign',
      params.target_user_id,
      undefined,
      undefined,
      { role_name: params.role_name }
    )
    return null
  }

  static async logPermissionChange(params: {
    user_id?: string
    role_name?: string
    permission_name?: string
    action?: 'grant' | 'revoke'
    session_id?: string
    request_id?: string
  }): Promise<string | null> {
    defaultLogger.warn('logPermissionChange not implemented, using logRBACAction')
    await this.logRBACAction(
      params.user_id || 'system',
      params.action || 'grant',
      undefined,
      undefined,
      undefined,
      { role_name: params.role_name, permission_name: params.permission_name }
    )
    return null
  }

  static async getRoleAssignmentAudit(params?: {
    limit?: number
    offset?: number
    user_id?: string
    role_name?: string
    action?: string
  }): Promise<Array<{
    id: string
    user_id: string
    target_user_id: string
    role_name: string
    action: 'assign' | 'revoke'
    performed_by?: string
    created_at: Date
  }>> {
    defaultLogger.warn('getRoleAssignmentAudit not implemented')
    return []
  }

  static async getPermissionChangeAudit(params?: {
    limit?: number
    offset?: number
    role_name?: string
    permission_name?: string
    action?: string
  }): Promise<Array<{
    id: string
    role_name: string
    permission_name: string
    action: 'grant' | 'revoke'
    performed_by?: string
    created_at: Date
  }>> {
    defaultLogger.warn('getPermissionChangeAudit not implemented')
    return []
  }

  static async getAllAuditLogs(params?: {
    limit?: number
    offset?: number
    category?: string
    severity?: string
    action?: string
  }): Promise<AuditLogEntry[]> {
    return await this.getRecentAuditLogs(params?.limit, params?.offset)
  }

  static async cleanupAuditLogs(_retentionDays?: number): Promise<number> {
    void _retentionDays
    defaultLogger.warn('cleanupAuditLogs not implemented')
    return 0
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