// useAuditLog Hook
// Provides easy access to audit logging functionality

import { useCallback } from 'react'
import { auditService, AuditLogEntry } from '@/lib/services/auditService'

export interface PermissionChangeAudit {
  id: string
  role_name: string
  permission_name: string
  action: 'grant' | 'revoke'
  performed_by?: string
  created_at: Date
}

export interface RoleAssignmentAudit {
  id: string
  user_id: string
  target_user_id: string
  role_name: string
  action: 'assign' | 'revoke'
  performed_by?: string
  created_at: Date
}

export interface UseAuditLogReturn {
  // Logging functions
  logChange: (params: {
    action: string
    table_name: string
    record_id?: string
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
    session_id?: string
    request_id?: string
    severity?: 'info' | 'warning' | 'error' | 'critical'
    category?: string
    details?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }) => Promise<string | null>

  logRoleAssignment: (params: {
    target_user_id: string
    role_name: string
    action: 'assign' | 'revoke'
    session_id?: string
    request_id?: string
  }) => Promise<string | null>

  logPermissionChange: (params: {
    role_name: string
    permission_name: string
    action: 'grant' | 'revoke'
    session_id?: string
    request_id?: string
  }) => Promise<string | null>

  // Fetching functions
  getRoleAssignmentAudit: (params?: {
    limit?: number
    offset?: number
    user_id?: string
    role_name?: string
    action?: string
  }) => Promise<RoleAssignmentAudit[]>

  getPermissionChangeAudit: (params?: {
    limit?: number
    offset?: number
    role_name?: string
    permission_name?: string
    action?: string
    }) => Promise<PermissionChangeAudit[]>

  getAllAuditLogs: (params?: {
    limit?: number
    offset?: number
    category?: string
    severity?: string
    action?: string
  }) => Promise<AuditLogEntry[]>

  // Utility functions
  cleanupAuditLogs: (retentionDays?: number) => Promise<number>
}

export function useAuditLog(): UseAuditLogReturn {
  const logChange = useCallback(async (params: {
    action: string
    table_name: string
    record_id?: string
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
    session_id?: string
    request_id?: string
    severity?: 'info' | 'warning' | 'error' | 'critical'
    category?: string
    details?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }) => {
    return await auditService.logChange(params)
  }, [])

  const logRoleAssignment = useCallback(async (params: {
    target_user_id: string
    role_name: string
    action: 'assign' | 'revoke'
    session_id?: string
    request_id?: string
  }) => {
    return await auditService.logRoleAssignment(params)
  }, [])

  const logPermissionChange = useCallback(async (params: {
    role_name: string
    permission_name: string
    action: 'grant' | 'revoke'
    session_id?: string
    request_id?: string
  }) => {
    return await auditService.logPermissionChange(params)
  }, [])

  const getRoleAssignmentAudit = useCallback(async (params?: {
    limit?: number
    offset?: number
    user_id?: string
    role_name?: string
    action?: string
  }) => {
    return await auditService.getRoleAssignmentAudit(params || {})
  }, [])

  const getPermissionChangeAudit = useCallback(async (params?: {
    limit?: number
    offset?: number
    role_name?: string
    permission_name?: string
    action?: string
  }) => {
    return await auditService.getPermissionChangeAudit(params || {})
  }, [])

  const getAllAuditLogs = useCallback(async (params?: {
    limit?: number
    offset?: number
    category?: string
    severity?: string
    action?: string
  }) => {
    return await auditService.getAllAuditLogs(params || {})
  }, [])

  const cleanupAuditLogs = useCallback(async (retentionDays?: number) => {
    return await auditService.cleanupAuditLogs(retentionDays)
  }, [])

  return {
    logChange,
    logRoleAssignment,
    logPermissionChange,
    getRoleAssignmentAudit,
    getPermissionChangeAudit,
    getAllAuditLogs,
    cleanupAuditLogs
  }
}
