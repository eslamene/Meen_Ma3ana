/**
 * Activity Service
 * Comprehensive service for logging and monitoring all site activities
 */

import { client } from '@/lib/db'
import { defaultLogger } from '@/lib/logger'

export type ActivityType = 
  | 'page_view' 
  | 'api_call' 
  | 'user_action' 
  | 'data_change' 
  | 'auth_event' 
  | 'system_event' 
  | 'error'

export type ActivityCategory = 
  | 'navigation' 
  | 'authentication' 
  | 'data' 
  | 'admin' 
  | 'system' 
  | 'security' 
  | 'performance'

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ActivityLogEntry {
  id?: string
  user_id?: string
  session_id?: string
  activity_type: ActivityType
  category?: ActivityCategory
  action: string
  resource_type?: string
  resource_id?: string
  resource_path?: string
  method?: string
  status_code?: number
  ip_address?: string
  user_agent?: string
  referer?: string
  details?: Record<string, unknown>
  metadata?: Record<string, unknown>
  severity?: ActivitySeverity
  created_at?: Date
}

export interface ActivityQueryParams {
  limit?: number
  offset?: number
  user_id?: string | 'null' | 'not_null' // 'null' for visitors, 'not_null' for authenticated, string for specific user
  activity_type?: ActivityType
  category?: ActivityCategory
  action?: string
  resource_type?: string
  resource_id?: string
  severity?: ActivitySeverity
  start_date?: Date
  end_date?: Date
  search?: string
}

/**
 * Activity Service for logging and monitoring all site activities
 */
export class ActivityService {
  /**
   * Log a page view
   */
  static async logPageView(params: {
    user_id?: string
    session_id?: string
    path: string
    referer?: string
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'page_view',
      category: 'navigation',
      action: 'view_page',
      resource_type: 'page',
      resource_path: params.path,
      referer: params.referer,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      severity: 'info',
    })
  }

  /**
   * Log an API call
   */
  static async logApiCall(params: {
    user_id?: string
    session_id?: string
    method: string
    path: string
    status_code: number
    ip_address?: string
    user_agent?: string
    details?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const severity = params.status_code >= 500 ? 'error' : 
                     params.status_code >= 400 ? 'warning' : 'info'

    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'api_call',
      category: 'system',
      action: `${params.method.toLowerCase()}_${params.path.replace(/\//g, '_').replace(/^_/, '')}`,
      resource_type: 'api',
      resource_path: params.path,
      method: params.method,
      status_code: params.status_code,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      details: params.details,
      metadata: params.metadata,
      severity,
    })
  }

  /**
   * Log a user action (clicks, form submissions, etc.)
   */
  static async logUserAction(params: {
    user_id?: string
    session_id?: string
    action: string
    resource_type?: string
    resource_id?: string
    resource_path?: string
    category?: ActivityCategory
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'user_action',
      category: params.category || 'data',
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      resource_path: params.resource_path,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      details: params.details,
      metadata: params.metadata,
      severity: 'info',
    })
  }

  /**
   * Log a data change (create, update, delete)
   */
  static async logDataChange(params: {
    user_id?: string
    session_id?: string
    action: 'create' | 'update' | 'delete'
    resource_type: string
    resource_id?: string
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'data_change',
      category: 'data',
      action: `${params.action}_${params.resource_type}`,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      details: {
        ...params.details,
        old_values: params.old_values,
        new_values: params.new_values,
      },
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      severity: 'info',
    })
  }

  /**
   * Log an authentication event
   */
  static async logAuthEvent(params: {
    user_id?: string
    session_id?: string
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'email_verification' | 'session_expired'
    success: boolean
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'auth_event',
      category: 'authentication',
      action: params.action,
      resource_type: 'auth',
      details: {
        ...params.details,
        success: params.success,
      },
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      severity: params.success ? 'info' : 'warning',
    })
  }

  /**
   * Log a system event
   */
  static async logSystemEvent(params: {
    action: string
    category?: ActivityCategory
    details?: Record<string, unknown>
    metadata?: Record<string, unknown>
    severity?: ActivitySeverity
  }): Promise<void> {
    await this.logActivity({
      activity_type: 'system_event',
      category: params.category || 'system',
      action: params.action,
      details: params.details,
      metadata: params.metadata,
      severity: params.severity || 'info',
    })
  }

  /**
   * Log an error
   */
  static async logError(params: {
    user_id?: string
    session_id?: string
    action: string
    error: Error | string
    resource_type?: string
    resource_path?: string
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, unknown>
    severity?: ActivitySeverity
  }): Promise<void> {
    const errorMessage = params.error instanceof Error 
      ? params.error.message 
      : params.error
    const errorStack = params.error instanceof Error ? params.error.stack : undefined

    await this.logActivity({
      user_id: params.user_id,
      session_id: params.session_id,
      activity_type: 'error',
      category: 'system',
      action: params.action,
      resource_type: params.resource_type,
      resource_path: params.resource_path,
      details: {
        ...params.details,
        error_message: errorMessage,
        error_stack: errorStack,
      },
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      severity: params.severity || 'error',
    })
  }

  /**
   * Core method to log an activity
   */
  private static async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      // Log for debugging (can be removed in production)
      defaultLogger.debug('Logging activity', {
        activity_type: entry.activity_type,
        action: entry.action,
        user_id: entry.user_id,
        session_id: entry.session_id,
        resource_path: entry.resource_path,
      })

      await client`
        INSERT INTO site_activity_log (
          user_id,
          session_id,
          activity_type,
          category,
          action,
          resource_type,
          resource_id,
          resource_path,
          method,
          status_code,
          ip_address,
          user_agent,
          referer,
          details,
          metadata,
          severity,
          created_at
        ) VALUES (
          ${entry.user_id || null},
          ${entry.session_id || null},
          ${entry.activity_type},
          ${entry.category || null},
          ${entry.action},
          ${entry.resource_type || null},
          ${entry.resource_id || null},
          ${entry.resource_path || null},
          ${entry.method || null},
          ${entry.status_code || null},
          ${entry.ip_address || null},
          ${entry.user_agent || null},
          ${entry.referer || null},
          ${entry.details ? JSON.stringify(entry.details) : null},
          ${entry.metadata ? JSON.stringify(entry.metadata) : null},
          ${entry.severity || 'info'},
          NOW()
        )
      `
      
      defaultLogger.debug('Activity logged successfully', {
        activity_type: entry.activity_type,
        action: entry.action,
      })
    } catch (error) {
      // Log to default logger but don't throw - activity logging should never break the app
      defaultLogger.error('Error logging activity:', error, {
        activity_type: entry.activity_type,
        action: entry.action,
        user_id: entry.user_id,
        session_id: entry.session_id,
        resource_path: entry.resource_path,
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  /**
   * Get activity logs with filtering
   * Returns both logs and total count
   */
  static async getActivityLogs(params: ActivityQueryParams = {}): Promise<{
    logs: ActivityLogEntry[]
    total: number
  }> {
    try {
      const limit = params.limit || 100
      const offset = params.offset || 0

      let query = 'SELECT * FROM site_activity_log WHERE 1=1'
      const conditions: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (params.user_id) {
        if (params.user_id === 'null') {
          // Filter for visitors only (user_id IS NULL)
          conditions.push(`user_id IS NULL`)
        } else if (params.user_id === 'not_null') {
          // Filter for authenticated users only (user_id IS NOT NULL)
          conditions.push(`user_id IS NOT NULL`)
        } else {
          // Filter for specific user
          conditions.push(`user_id = $${paramIndex++}`)
          values.push(params.user_id)
        }
      }

      if (params.activity_type) {
        conditions.push(`activity_type = $${paramIndex++}`)
        values.push(params.activity_type)
      }

      if (params.category) {
        conditions.push(`category = $${paramIndex++}`)
        values.push(params.category)
      }

      if (params.action) {
        conditions.push(`action = $${paramIndex++}`)
        values.push(params.action)
      }

      if (params.resource_type) {
        conditions.push(`resource_type = $${paramIndex++}`)
        values.push(params.resource_type)
      }

      if (params.resource_id) {
        conditions.push(`resource_id = $${paramIndex++}`)
        values.push(params.resource_id)
      }

      if (params.severity) {
        conditions.push(`severity = $${paramIndex++}`)
        values.push(params.severity)
      }

      if (params.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`)
        values.push(params.start_date)
      }

      if (params.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`)
        values.push(params.end_date)
      }

      if (params.search) {
        conditions.push(`(
          action ILIKE $${paramIndex} OR 
          resource_path ILIKE $${paramIndex} OR 
          details::text ILIKE $${paramIndex}
        )`)
        values.push(`%${params.search}%`)
        paramIndex++
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ')
      }

      // Build count query (same conditions, but count instead of select)
      let countQuery = 'SELECT COUNT(*) as total FROM site_activity_log WHERE 1=1'
      if (conditions.length > 0) {
        countQuery += ' AND ' + conditions.join(' AND ')
      }
      
      // Get total count (without limit/offset)
      const countValues = [...values] // Copy values without limit/offset
      const countResult = await client.unsafe(countQuery, countValues as unknown[])
      
      const countRows = Array.isArray(countResult)
        ? countResult
        : (countResult && typeof countResult === 'object' && 'rows' in countResult && Array.isArray((countResult as { rows?: unknown[] }).rows))
          ? (countResult as { rows: unknown[] }).rows
          : []
      
      const total = countRows.length > 0 ? parseInt((countRows[0] as any).total || '0') : 0

      // Get paginated results
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await client.unsafe(query, values as unknown[])

      // Extract rows from drizzle result
      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []

      return {
        logs: extractedRows as ActivityLogEntry[],
        total
      }
    } catch (error) {
      defaultLogger.error('Error getting activity logs:', error)
      return { logs: [], total: 0 }
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(params: {
    start_date?: Date
    end_date?: Date
    group_by?: 'hour' | 'day' | 'week' | 'month'
  } = {}): Promise<Array<{
    period: string
    activity_type: string
    count: number
    unique_users: number
    unique_sessions: number
  }>> {
    try {
      const groupBy = params.group_by || 'day'
      const truncFormat = groupBy === 'hour' ? 'hour' : 
                         groupBy === 'day' ? 'day' : 
                         groupBy === 'week' ? 'week' : 'month'

      let query = `
        SELECT 
          DATE_TRUNC('${truncFormat}', created_at) as period,
          activity_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM site_activity_log
        WHERE 1=1
      `

      const conditions: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (params.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`)
        values.push(params.start_date)
      }

      if (params.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`)
        values.push(params.end_date)
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ')
      }

      query += `
        GROUP BY DATE_TRUNC('${truncFormat}', created_at), activity_type
        ORDER BY period DESC, activity_type
      `

      const result = await client.unsafe(query, values as unknown[])

      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []

      return extractedRows.map((row: any) => ({
        period: row.period.toISOString(),
        activity_type: row.activity_type,
        count: parseInt(row.count),
        unique_users: parseInt(row.unique_users),
        unique_sessions: parseInt(row.unique_sessions),
      }))
    } catch (error) {
      defaultLogger.error('Error getting activity stats:', error)
      return []
    }
  }

  /**
   * Clean up old activity logs
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const result = await client`
        SELECT cleanup_old_activity_logs(${retentionDays})
      `

      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []

      return extractedRows.length > 0 ? parseInt((extractedRows[0] as any).cleanup_old_activity_logs || '0') : 0
    } catch (error) {
      defaultLogger.error('Error cleaning up old logs:', error)
      return 0
    }
  }

  /**
   * Get visitor statistics (anonymous users only)
   */
  static async getVisitorStats(params: {
    start_date?: Date
    end_date?: Date
    group_by?: 'hour' | 'day' | 'week' | 'month'
  } = {}): Promise<Array<{
    period: string
    unique_visitors: number
    unique_sessions: number
    page_views: number
    unique_pages: number
    avg_session_duration: number
  }>> {
    try {
      const groupBy = params.group_by || 'day'
      const truncFormat = groupBy === 'hour' ? 'hour' : 
                         groupBy === 'day' ? 'day' : 
                         groupBy === 'week' ? 'week' : 'month'

      let query = `
        SELECT 
          DATE_TRUNC('${truncFormat}', created_at) as period,
          COUNT(DISTINCT session_id) as unique_sessions,
          COUNT(DISTINCT ip_address) as unique_visitors,
          COUNT(*) as page_views,
          COUNT(DISTINCT resource_path) as unique_pages
        FROM site_activity_log
        WHERE user_id IS NULL AND activity_type = 'page_view'
      `

      const conditions: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (params.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`)
        values.push(params.start_date)
      }

      if (params.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`)
        values.push(params.end_date)
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ')
      }

      query += `
        GROUP BY DATE_TRUNC('${truncFormat}', created_at)
        ORDER BY period DESC
      `

      const result = await client.unsafe(query, values as unknown[])

      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []

      // Get session durations
      const sessionQuery = `
        SELECT 
          DATE_TRUNC('${truncFormat}', session_start) as period,
          AVG(session_duration_seconds) as avg_duration
        FROM visitor_sessions
        WHERE 1=1
        ${params.start_date ? `AND session_start >= $${paramIndex}` : ''}
        ${params.end_date ? `AND session_end <= $${paramIndex + (params.start_date ? 1 : 0)}` : ''}
        GROUP BY DATE_TRUNC('${truncFormat}', session_start)
      `

      const sessionResult = await client.unsafe(sessionQuery, values as unknown[])
      const sessionRows = Array.isArray(sessionResult)
        ? sessionResult
        : (sessionResult && typeof sessionResult === 'object' && 'rows' in sessionResult && Array.isArray((sessionResult as { rows?: unknown[] }).rows))
          ? (sessionResult as { rows: unknown[] }).rows
          : []

      const sessionMap = new Map(sessionRows.map((row: any) => [
        row.period.toISOString(),
        parseFloat(row.avg_duration || '0')
      ]))

      return extractedRows.map((row: any) => ({
        period: row.period.toISOString(),
        unique_visitors: parseInt(row.unique_visitors || '0'),
        unique_sessions: parseInt(row.unique_sessions || '0'),
        page_views: parseInt(row.page_views || '0'),
        unique_pages: parseInt(row.unique_pages || '0'),
        avg_session_duration: sessionMap.get(row.period.toISOString()) || 0,
      }))
    } catch (error) {
      defaultLogger.error('Error getting visitor stats:', error)
      return []
    }
  }

  /**
   * Get visitor sessions with journey tracking
   */
  static async getVisitorSessions(params: {
    limit?: number
    offset?: number
    start_date?: Date
    end_date?: Date
  } = {}): Promise<Array<{
    session_id: string
    session_start: Date
    session_end: Date
    page_views: number
    unique_pages: number
    pages_visited: string[]
    ip_address?: string
    user_agent?: string
    session_duration_seconds: number
  }>> {
    try {
      const limit = params.limit || 100
      const offset = params.offset || 0

      let query = `
        SELECT * FROM visitor_sessions
        WHERE 1=1
      `

      const conditions: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (params.start_date) {
        conditions.push(`session_start >= $${paramIndex++}`)
        values.push(params.start_date)
      }

      if (params.end_date) {
        conditions.push(`session_end <= $${paramIndex++}`)
        values.push(params.end_date)
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ')
      }

      query += ` ORDER BY session_start DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await client.unsafe(query, values as unknown[])

      const extractedRows = Array.isArray(result)
        ? result
        : (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows?: unknown[] }).rows))
          ? (result as { rows: unknown[] }).rows
          : []

      return extractedRows.map((row: any) => ({
        session_id: row.session_id,
        session_start: row.session_start,
        session_end: row.session_end,
        page_views: parseInt(row.page_views || '0'),
        unique_pages: parseInt(row.unique_pages || '0'),
        pages_visited: Array.isArray(row.pages_visited) ? row.pages_visited : [],
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        session_duration_seconds: parseFloat(row.session_duration_seconds || '0'),
      }))
    } catch (error) {
      defaultLogger.error('Error getting visitor sessions:', error)
      return []
    }
  }
}

/**
 * Helper function to extract request info
 */
export function extractRequestInfo(request: Request): { 
  ipAddress?: string
  userAgent?: string
  referer?: string
} {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('cf-connecting-ip') ||
                   undefined

  const userAgent = request.headers.get('user-agent') || undefined
  const referer = request.headers.get('referer') || undefined

  return { ipAddress, userAgent, referer }
}

/**
 * Helper function to generate session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

