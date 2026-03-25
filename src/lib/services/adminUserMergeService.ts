/**
 * Admin user account merge: preview counts, execute reassignment + optional source delete, rollback from backup.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '@/lib/logger'
import { ApiError, ApiErrorCodes } from '@/lib/utils/api-errors'

/** User row fields returned for merge preview. */
export interface UserMergePreviewUser {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at?: string | null
}

/** Per-table counts shown in merge preview. */
export interface UserMergeRecordsToMigrate {
  contributions: number
  notifications: number
  recurring_contributions: number
  sponsorships: number
  communications: number
  cases: number
  case_status_history: number
  case_updates: number
  projects: number
  contribution_approval_status: number
  category_detection_rules: number
  landing_stats: number
  system_config: number
  system_content: number
  site_activity_logs: number
  beneficiaries: number
  beneficiary_documents: number
  audit_logs: number
  audit_logs_table: number
}

/** Reassigned row counts during merge execute (before total + errors). */
export interface UserMergeExecuteStatCounts {
  contributions?: number
  notifications?: number
  recurring_contributions?: number
  sponsorships?: number
  communications?: number
  cases?: number
  case_status_history?: number
  case_updates?: number
  projects?: number
  contribution_approval_status?: number
  category_detection_rules?: number
  landing_stats?: number
  system_config?: number
  system_content?: number
  site_activity_logs?: number
  beneficiaries?: number
  beneficiary_documents?: number
  audit_logs?: number
  audit_logs_table?: number
  source_user_deleted?: number
}

export interface UserMergeExecuteStats extends UserMergeExecuteStatCounts {
  total_records_migrated: number
  errors?: string[]
}

/** Restored row counts during rollback (before total + errors). */
export interface UserMergeRollbackStatCounts {
  contributions?: number
  notifications?: number
  recurring_contributions?: number
  sponsorships?: number
  communications?: number
  cases?: number
  case_status_history?: number
  case_updates?: number
  projects?: number
  contribution_approval_status?: number
  category_detection_rules?: number
  landing_stats?: number
  system_config?: number
  system_content?: number
  beneficiaries?: number
  beneficiary_documents?: number
  source_user_restored?: number
}

export interface UserMergeRollbackStats extends UserMergeRollbackStatCounts {
  total_records_restored: number
  errors?: string[]
}

export interface UserMergePreviewResult {
  success: true
  preview: {
    source_user: UserMergePreviewUser
    target_user: UserMergePreviewUser
    records_to_migrate: UserMergeRecordsToMigrate
    validation: {
      can_merge: boolean
      warnings: string[]
      errors: string[]
    }
  }
  summary: {
    total_records_to_migrate: number
    tables_affected: string[]
    validation_passed: boolean
    has_warnings: boolean
  }
}

export interface ExecuteUserMergeOptions {
  serviceRole: SupabaseClient
  fromUserId: string
  toUserId: string
  deleteSource: boolean
  adminUserId: string
  ipAddress: string | null
  userAgent: string | null
  logger: Logger
  isDevelopment: boolean
  /** Runs after backup row exists; use for audit logging. */
  afterBackupCreated: (ctx: {
    mergeId: string
    backupId: string
    fromUserId: string
    toUserId: string
    deleteSource: boolean
  }) => Promise<void>
}

export interface ExecuteUserMergeResult {
  merge_id: string
  backup_id: string
  stats: UserMergeExecuteStats
  warnings?: string
  totalRecords: number
  errors: string[]
}

export interface RollbackUserMergeResult {
  stats: UserMergeRollbackStats
  warnings?: string
  totalRestored: number
}

function assertUserIds(fromUserId: string, toUserId: string): void {
  if (!fromUserId || !toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'fromUserId and toUserId are required', 400)
  }
  if (fromUserId === toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot merge user with itself', 400)
  }
}

export async function previewUserMerge(
  serviceRole: SupabaseClient,
  fromUserId: string,
  toUserId: string,
  logger: Logger
): Promise<UserMergePreviewResult> {
  assertUserIds(fromUserId, toUserId)

  const { data: fromUser, error: fromError } = await serviceRole
    .from('users')
    .select('id, email, first_name, last_name, created_at')
    .eq('id', fromUserId)
    .single()

  if (fromError || !fromUser) {
    throw new ApiError('NOT_FOUND', 'Source user not found', 404)
  }

  const { data: toUser, error: toError } = await serviceRole
    .from('users')
    .select('id, email, first_name, last_name, created_at')
    .eq('id', toUserId)
    .single()

  if (toError || !toUser) {
    throw new ApiError('NOT_FOUND', 'Target user not found', 404)
  }

  const countRecords = async (table: string, field: string): Promise<number> => {
    try {
      const { count } = await serviceRole
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(field, fromUserId)
      return count || 0
    } catch (error) {
      logger.debug(`Error counting ${table}.${field}:`, error)
      return 0
    }
  }

  const countRecordsMultiple = async (table: string, fields: string[]): Promise<number> => {
    try {
      let total = 0
      for (const field of fields) {
        const { count } = await serviceRole
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(field, fromUserId)
        total += count || 0
      }
      return total
    } catch (error) {
      logger.debug(`Error counting ${table} with multiple fields:`, error)
      return 0
    }
  }

  const recordsToMigrate = {
    contributions: await countRecords('contributions', 'donor_id'),
    notifications: await countRecords('notifications', 'recipient_id'),
    recurring_contributions: await countRecords('recurring_contributions', 'donor_id'),
    sponsorships: await countRecords('sponsorships', 'sponsor_id'),
    communications: await countRecordsMultiple('communications', ['sender_id', 'recipient_id']),
    cases: await countRecordsMultiple('cases', ['created_by', 'assigned_to', 'sponsored_by']),
    case_status_history: await countRecords('case_status_history', 'changed_by'),
    case_updates: await countRecords('case_updates', 'created_by'),
    projects: await countRecordsMultiple('projects', ['created_by', 'assigned_to']),
    contribution_approval_status: await countRecords('contribution_approval_status', 'admin_id'),
    category_detection_rules: await countRecordsMultiple('category_detection_rules', [
      'created_by',
      'updated_by',
    ]),
    landing_stats: await countRecords('landing_stats', 'updated_by'),
    system_config: await countRecords('system_config', 'updated_by'),
    system_content: await countRecords('system_content', 'updated_by'),
    site_activity_logs: await countRecords('site_activity_log', 'user_id'),
    beneficiaries: await countRecords('beneficiaries', 'created_by'),
    beneficiary_documents: await countRecords('beneficiary_documents', 'uploaded_by').catch(() => 0),
    audit_logs: await countRecords('rbac_audit_log', 'user_id').catch(() => 0),
    audit_logs_table: await countRecords('audit_logs', 'user_id').catch(() => 0),
  } satisfies UserMergeRecordsToMigrate

  const preview = {
    source_user: fromUser as UserMergePreviewUser,
    target_user: toUser as UserMergePreviewUser,
    records_to_migrate: recordsToMigrate,
    validation: {
      can_merge: true,
      warnings: [] as string[],
      errors: [] as string[],
    },
  }

  const totalRecords = Object.values(preview.records_to_migrate).reduce(
    (sum, val) => sum + (typeof val === 'number' ? val : 0),
    0
  )

  if (totalRecords === 0) {
    preview.validation.warnings.push(
      'No records found to migrate. The source user has no associated data.'
    )
  }

  const { data: targetUserFull } = await serviceRole
    .from('users')
    .select('is_active, email_verified')
    .eq('id', toUserId)
    .single()

  if (targetUserFull && !targetUserFull.is_active) {
    preview.validation.warnings.push('Target user account is inactive. Consider activating it before merge.')
  }

  if (targetUserFull && !targetUserFull.email_verified) {
    preview.validation.warnings.push('Target user email is not verified.')
  }

  const { data: sourceContributions } = await serviceRole
    .from('contributions')
    .select('case_id')
    .eq('donor_id', fromUserId)
    .not('case_id', 'is', null)

  const { data: targetContributions } = await serviceRole
    .from('contributions')
    .select('case_id')
    .eq('donor_id', toUserId)
    .not('case_id', 'is', null)

  if (sourceContributions && targetContributions) {
    const sourceCaseIds = new Set(sourceContributions.map(c => c.case_id))
    const targetCaseIds = new Set(targetContributions.map(c => c.case_id))
    const commonCases = [...sourceCaseIds].filter(id => targetCaseIds.has(id))

    if (commonCases.length > 0) {
      preview.validation.warnings.push(
        `Both users have contributions to ${commonCases.length} case(s). This is normal and will be merged correctly.`
      )
    }
  }

  return {
    success: true,
    preview,
    summary: {
      total_records_to_migrate: totalRecords,
      tables_affected: Object.entries(preview.records_to_migrate)
        .filter(([, count]) => count > 0)
        .map(([table]) => table),
      validation_passed: preview.validation.errors.length === 0,
      has_warnings: preview.validation.warnings.length > 0,
    },
  }
}

export async function executeUserMerge(options: ExecuteUserMergeOptions): Promise<ExecuteUserMergeResult> {
  const {
    serviceRole: serviceRoleClient,
    fromUserId,
    toUserId,
    deleteSource,
    adminUserId,
    ipAddress,
    userAgent,
    logger,
    isDevelopment,
    afterBackupCreated,
  } = options

  assertUserIds(fromUserId, toUserId)

  const { data: fromUser, error: fromError } = await serviceRoleClient
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', fromUserId)
    .single()

  if (fromError || !fromUser) {
    throw new ApiError('NOT_FOUND', 'Source user not found', 404)
  }

  const { data: toUser, error: toError } = await serviceRoleClient
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', toUserId)
    .single()

  if (toError || !toUser) {
    throw new ApiError('NOT_FOUND', 'Target user not found', 404)
  }

  const mergeId = crypto.randomUUID()
  let backupId: string | null = null

  try {
    const { data: backupResult, error: backupError } = await serviceRoleClient.rpc(
      'create_user_merge_backup',
      {
        p_merge_id: mergeId,
        p_from_user_id: fromUserId,
        p_to_user_id: toUserId,
        p_admin_user_id: adminUserId,
        p_delete_source: deleteSource,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
      }
    )

    if (backupError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to create backup:', {
        error: backupError,
        message: backupError.message,
        code: backupError.code,
        hint: backupError.hint,
        details: backupError.details,
      })

      if (backupError.message?.includes('does not exist') || backupError.code === '42883') {
        throw new ApiError(
          ApiErrorCodes.MIGRATION_REQUIRED,
          'Backup system not initialized. Please run migration 078_create_user_merge_backup_system.sql first.',
          500,
          {
            migration_required: true,
            technicalMessage: backupError.message,
          }
        )
      }

      throw new ApiError(
        ApiErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create backup before merge. Operation aborted for safety.',
        500,
        {
          migration_required: false,
          postgresCode: backupError.code,
          hint: backupError.hint ?? undefined,
          technicalMessage: backupError.message || 'Unknown error',
          fullError: isDevelopment ? JSON.stringify(backupError, null, 2) : undefined,
        }
      )
    }

    backupId = backupResult as string
    logger.info('Backup created successfully', { mergeId, backupId })
  } catch (error) {
    if (error instanceof ApiError) throw error

    logger.logStableError('INTERNAL_SERVER_ERROR', 'Exception creating backup:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('does not exist') || errorMessage.includes('function')) {
      throw new ApiError(
        ApiErrorCodes.MIGRATION_REQUIRED,
        'Backup system not initialized. Please run migration 078_create_user_merge_backup_system.sql first.',
        500,
        { migration_required: true, technicalMessage: errorMessage }
      )
    }

    throw new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      'Failed to create backup before merge. Operation aborted for safety.',
      500,
      {
        technicalMessage: errorMessage,
        note:
          'The merge operation requires a backup to be created first. Please ensure migration 078_create_user_merge_backup_system.sql has been applied.',
      }
    )
  }

  await afterBackupCreated({
    mergeId,
    backupId: backupId!,
    fromUserId,
    toUserId,
    deleteSource,
  })

  try {
    return await runUserMergeReassignment({
      serviceRoleClient,
      fromUserId,
      toUserId,
      deleteSource,
      mergeId,
      backupId: backupId!,
      logger,
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Account merge error', { error })
    if (backupId) {
      await markUserMergeBackupFailed(
        serviceRoleClient,
        backupId,
        error instanceof Error ? error.message : 'Unknown error',
        logger
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const apiError = new ApiError(
      ApiErrorCodes.INTERNAL_SERVER_ERROR,
      `Failed to merge accounts: ${errorMessage}`,
      500
    )
    if (backupId) {
      apiError.details = {
        backup_id: backupId,
        note: 'A backup was created. You may need to manually verify data integrity.',
      }
    }
    throw apiError
  }
}

interface RunUserMergeReassignmentParams {
  serviceRoleClient: SupabaseClient
  fromUserId: string
  toUserId: string
  deleteSource: boolean
  mergeId: string
  backupId: string
  logger: Logger
}

async function runUserMergeReassignment(
  params: RunUserMergeReassignmentParams
): Promise<ExecuteUserMergeResult> {
  const { serviceRoleClient, fromUserId, toUserId, deleteSource, mergeId, backupId, logger } = params

  const now = new Date().toISOString()
  const stats: UserMergeExecuteStatCounts = {}
  const errors: string[] = []

  const updateAndCount = async (
    table: string,
    field: string,
    description: string
  ): Promise<number> => {
    try {
      const { count } = await serviceRoleClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(field, fromUserId)

      const countValue = count || 0

      if (countValue > 0) {
        const { error } = await serviceRoleClient
          .from(table)
          .update({ [field]: toUserId, updated_at: now })
          .eq(field, fromUserId)

        if (error) {
          logger.logStableError('INTERNAL_SERVER_ERROR', `Error reassigning ${description}:`, error)
          errors.push(`${description}: ${error.message}`)
          return 0
        }
      }

      return countValue
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', `Error processing ${description}:`, error)
      errors.push(`${description}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return 0
    }
  }

  const updateMultipleFields = async (
    table: string,
    fields: string[],
    description: string
  ): Promise<number> => {
    try {
      let totalCount = 0

      for (const field of fields) {
        const { count } = await serviceRoleClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(field, fromUserId)

        const countValue = count || 0

        if (countValue > 0) {
          const { error } = await serviceRoleClient
            .from(table)
            .update({ [field]: toUserId, updated_at: now })
            .eq(field, fromUserId)

          if (error) {
            logger.logStableError(
              'INTERNAL_SERVER_ERROR',
              `Error reassigning ${description} (${field}):`,
              error
            )
            errors.push(`${description} (${field}): ${error.message}`)
          } else {
            totalCount += countValue
          }
        }
      }

      return totalCount
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', `Error processing ${description}:`, error)
      errors.push(`${description}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return 0
    }
  }

  stats.contributions = await updateAndCount('contributions', 'donor_id', 'contributions')
  stats.notifications = await updateAndCount('notifications', 'recipient_id', 'notifications')
  stats.recurring_contributions = await updateAndCount(
    'recurring_contributions',
    'donor_id',
    'recurring contributions'
  )
  stats.sponsorships = await updateAndCount('sponsorships', 'sponsor_id', 'sponsorships')
  stats.communications = await updateMultipleFields('communications', ['sender_id', 'recipient_id'], 'communications')
  stats.cases = await updateMultipleFields('cases', ['created_by', 'assigned_to', 'sponsored_by'], 'cases')
  stats.case_status_history = await updateAndCount('case_status_history', 'changed_by', 'case status history')
  stats.case_updates = await updateAndCount('case_updates', 'created_by', 'case updates')
  stats.projects = await updateMultipleFields('projects', ['created_by', 'assigned_to'], 'projects')
  stats.contribution_approval_status = await updateAndCount(
    'contribution_approval_status',
    'admin_id',
    'contribution approval status'
  )
  stats.category_detection_rules = await updateMultipleFields(
    'category_detection_rules',
    ['created_by', 'updated_by'],
    'category detection rules'
  )
  stats.landing_stats = await updateAndCount('landing_stats', 'updated_by', 'landing stats')
  stats.system_config = await updateAndCount('system_config', 'updated_by', 'system config')
  stats.system_content = await updateAndCount('system_content', 'updated_by', 'system content')
  stats.site_activity_logs = await updateAndCount('site_activity_log', 'user_id', 'site activity logs')
  stats.beneficiaries = await updateAndCount('beneficiaries', 'created_by', 'beneficiaries')

  try {
    const { count: beneficiaryDocsCount } = await serviceRoleClient
      .from('beneficiary_documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', fromUserId)

    if (beneficiaryDocsCount && beneficiaryDocsCount > 0) {
      const { error: beneficiaryDocsError } = await serviceRoleClient
        .from('beneficiary_documents')
        .update({ uploaded_by: toUserId, updated_at: now })
        .eq('uploaded_by', fromUserId)

      if (beneficiaryDocsError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning beneficiary documents:', beneficiaryDocsError)
        errors.push(`beneficiary documents: ${beneficiaryDocsError.message}`)
        stats.beneficiary_documents = 0
      } else {
        stats.beneficiary_documents = beneficiaryDocsCount
      }
    } else {
      stats.beneficiary_documents = 0
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error processing beneficiary documents:', error)
    errors.push(`beneficiary documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    stats.beneficiary_documents = 0
  }

  try {
    const { count: auditCount } = await serviceRoleClient
      .from('rbac_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', fromUserId)

    if (auditCount && auditCount > 0) {
      const { error: auditError } = await serviceRoleClient
        .from('rbac_audit_log')
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId)

      if (auditError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning audit logs:', auditError)
        errors.push(`audit logs: ${auditError.message}`)
        stats.audit_logs = 0
      } else {
        stats.audit_logs = auditCount
      }
    } else {
      stats.audit_logs = 0
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error processing audit logs:', error)
    errors.push(`audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    stats.audit_logs = 0
  }

  try {
    const { count: auditLogsCount } = await serviceRoleClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', fromUserId)

    if (auditLogsCount && auditLogsCount > 0) {
      const { error: auditLogsError } = await serviceRoleClient
        .from('audit_logs')
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId)

      if (auditLogsError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error reassigning audit_logs:', auditLogsError)
        errors.push(`audit_logs: ${auditLogsError.message}`)
        stats.audit_logs_table = 0
      } else {
        stats.audit_logs_table = auditLogsCount
      }
    } else {
      stats.audit_logs_table = 0
    }
  } catch (error) {
    logger.debug('audit_logs table not found or error:', error)
    stats.audit_logs_table = 0
  }

  try {
    const { data: affectedCases } = await serviceRoleClient
      .from('cases')
      .select('id')
      .or(`created_by.eq.${toUserId},assigned_to.eq.${toUserId},sponsored_by.eq.${toUserId}`)

    if (affectedCases && affectedCases.length > 0) {
      for (const caseItem of affectedCases) {
        const { data: caseContributions } = await serviceRoleClient
          .from('contributions')
          .select('amount')
          .eq('case_id', caseItem.id)
          .eq('status', 'approved')

        if (caseContributions) {
          const totalAmount = caseContributions.reduce(
            (sum, c) => sum + parseFloat(c.amount?.toString() || '0'),
            0
          )

          await serviceRoleClient
            .from('cases')
            .update({ current_amount: totalAmount.toString() })
            .eq('id', caseItem.id)
        }
      }
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error recalculating case amounts:', error)
    errors.push(`case amount recalculation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  if (deleteSource) {
    try {
      const { error: deleteError } = await serviceRoleClient.from('users').delete().eq('id', fromUserId)

      if (deleteError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting source user:', deleteError)
        errors.push(`delete user: ${deleteError.message}`)
      } else {
        try {
          await serviceRoleClient.auth.admin.deleteUser(fromUserId)
          stats.source_user_deleted = 1
        } catch (authDeleteError) {
          logger.warn('Could not delete auth user:', authDeleteError)
          errors.push(
            `delete auth user: ${authDeleteError instanceof Error ? authDeleteError.message : 'Unknown error'}`
          )
          stats.source_user_deleted = 0
        }
      }
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting source user:', error)
      errors.push(`delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      stats.source_user_deleted = 0
    }
  } else {
    stats.source_user_deleted = 0
  }

  const totalRecords = Object.values(stats).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val
    return sum
  }, 0)

  try {
    await serviceRoleClient
      .from('user_merge_backups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_records_migrated: totalRecords,
        errors: errors.length > 0 ? errors : null,
      })
      .eq('id', backupId)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to update backup status:', error)
  }

  const statsOut: UserMergeExecuteStats = {
    ...stats,
    total_records_migrated: totalRecords,
    ...(errors.length > 0 ? { errors } : {}),
  }

  return {
    merge_id: mergeId,
    backup_id: backupId,
    stats: statsOut,
    totalRecords,
    errors,
    ...(errors.length > 0
      ? { warnings: `Some operations had errors: ${errors.join('; ')}` }
      : {}),
  }
}

/** Mark backup failed (e.g. after unexpected error mid-merge). */
export async function markUserMergeBackupFailed(
  serviceRole: SupabaseClient,
  backupId: string,
  message: string,
  logger: Logger
): Promise<void> {
  try {
    await serviceRole
      .from('user_merge_backups')
      .update({
        status: 'failed',
        errors: [message],
      })
      .eq('id', backupId)
  } catch (updateError) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to update backup status to failed', {
      error: updateError,
    })
  }
}

export async function rollbackUserMerge(
  serviceRole: SupabaseClient,
  mergeId: string,
  logger: Logger
): Promise<RollbackUserMergeResult> {
  const { data: backup, error: backupError } = await serviceRole
    .from('user_merge_backups')
    .select('*')
    .eq('merge_id', mergeId)
    .single()

  if (backupError || !backup) {
    throw new ApiError('NOT_FOUND', 'Merge backup not found. Cannot rollback.', 404)
  }

  if (backup.status === 'rolled_back') {
    throw new ApiError('VALIDATION_ERROR', 'This merge has already been rolled back.', 400)
  }

  if (backup.status !== 'completed') {
    throw new ApiError(
      'VALIDATION_ERROR',
      `Cannot rollback merge with status: ${backup.status}. Only completed merges can be rolled back.`,
      400
    )
  }

  const backupData = backup.backup_data as Record<string, Array<{ id: string; [key: string]: unknown }>>
  const stats: UserMergeRollbackStatCounts = {}
  const errors: string[] = []

  const restoreRecords = async (
    table: string,
    field: string,
    records: Array<{ id: string; [key: string]: unknown }>,
    description: string
  ): Promise<number> => {
    if (!records || records.length === 0) return 0

    try {
      let restored = 0
      for (const record of records) {
        const { error } = await serviceRole
          .from(table)
          .update({ [field]: backup.from_user_id, updated_at: new Date().toISOString() })
          .eq('id', record.id)

        if (error) {
          logger.logStableError('INTERNAL_SERVER_ERROR', `Error restoring ${description} record ${record.id}:`, error)
          errors.push(`${description} (${record.id}): ${error.message}`)
        } else {
          restored++
        }
      }
      return restored
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', `Error restoring ${description}:`, error)
      errors.push(`${description}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return 0
    }
  }

  if (backupData.contributions) {
    stats.contributions = await restoreRecords(
      'contributions',
      'donor_id',
      backupData.contributions,
      'contributions'
    )
  }

  if (backupData.notifications) {
    stats.notifications = await restoreRecords(
      'notifications',
      'recipient_id',
      backupData.notifications,
      'notifications'
    )
  }

  if (backupData.recurring_contributions) {
    stats.recurring_contributions = await restoreRecords(
      'recurring_contributions',
      'donor_id',
      backupData.recurring_contributions,
      'recurring contributions'
    )
  }

  if (backupData.sponsorships) {
    stats.sponsorships = await restoreRecords('sponsorships', 'sponsor_id', backupData.sponsorships, 'sponsorships')
  }

  if (backupData.communications) {
    for (const comm of backupData.communications) {
      try {
        const field = comm.sender_id === backup.to_user_id ? 'sender_id' : 'recipient_id'
        const { error } = await serviceRole
          .from('communications')
          .update({ [field]: backup.from_user_id, updated_at: new Date().toISOString() })
          .eq('id', comm.id)

        if (error) {
          errors.push(`communications (${comm.id}): ${error.message}`)
        } else {
          stats.communications = (stats.communications || 0) + 1
        }
      } catch (error) {
        errors.push(`communications (${comm.id}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  if (backupData.cases) {
    for (const caseRecord of backupData.cases) {
      try {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (caseRecord.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
        if (caseRecord.assigned_to === backup.to_user_id) updates.assigned_to = backup.from_user_id
        if (caseRecord.sponsored_by === backup.to_user_id) updates.sponsored_by = backup.from_user_id

        if (Object.keys(updates).length > 1) {
          const { error } = await serviceRole.from('cases').update(updates).eq('id', caseRecord.id)

          if (error) {
            errors.push(`cases (${caseRecord.id}): ${error.message}`)
          } else {
            stats.cases = (stats.cases || 0) + 1
          }
        }
      } catch (error) {
        errors.push(`cases (${caseRecord.id}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  if (backupData.case_status_history) {
    stats.case_status_history = await restoreRecords(
      'case_status_history',
      'changed_by',
      backupData.case_status_history,
      'case status history'
    )
  }

  if (backupData.case_updates) {
    stats.case_updates = await restoreRecords(
      'case_updates',
      'created_by',
      backupData.case_updates,
      'case updates'
    )
  }

  if (backupData.projects) {
    for (const project of backupData.projects) {
      try {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (project.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
        if (project.assigned_to === backup.to_user_id) updates.assigned_to = backup.from_user_id

        if (Object.keys(updates).length > 1) {
          const { error } = await serviceRole.from('projects').update(updates).eq('id', project.id)

          if (error) {
            errors.push(`projects (${project.id}): ${error.message}`)
          } else {
            stats.projects = (stats.projects || 0) + 1
          }
        }
      } catch (error) {
        errors.push(`projects (${project.id}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  if (backupData.contribution_approval_status) {
    stats.contribution_approval_status = await restoreRecords(
      'contribution_approval_status',
      'admin_id',
      backupData.contribution_approval_status,
      'contribution approval status'
    )
  }

  if (backupData.category_detection_rules) {
    for (const rule of backupData.category_detection_rules) {
      try {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (rule.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
        if (rule.updated_by === backup.to_user_id) updates.updated_by = backup.from_user_id

        if (Object.keys(updates).length > 1) {
          const { error } = await serviceRole
            .from('category_detection_rules')
            .update(updates)
            .eq('id', rule.id)

          if (error) {
            errors.push(`category_detection_rules (${rule.id}): ${error.message}`)
          } else {
            stats.category_detection_rules = (stats.category_detection_rules || 0) + 1
          }
        }
      } catch (error) {
        errors.push(`category_detection_rules (${rule.id}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  if (backupData.landing_stats) {
    stats.landing_stats = await restoreRecords(
      'landing_stats',
      'updated_by',
      backupData.landing_stats,
      'landing stats'
    )
  }

  if (backupData.system_config) {
    stats.system_config = await restoreRecords(
      'system_config',
      'updated_by',
      backupData.system_config,
      'system config'
    )
  }

  if (backupData.system_content) {
    stats.system_content = await restoreRecords(
      'system_content',
      'updated_by',
      backupData.system_content,
      'system content'
    )
  }

  if (backupData.beneficiaries) {
    stats.beneficiaries = await restoreRecords(
      'beneficiaries',
      'created_by',
      backupData.beneficiaries,
      'beneficiaries'
    )
  }

  if (backupData.beneficiary_documents) {
    stats.beneficiary_documents = await restoreRecords(
      'beneficiary_documents',
      'uploaded_by',
      backupData.beneficiary_documents,
      'beneficiary documents'
    )
  }

  if (backup.delete_source && backupData.source_user) {
    try {
      const { error: restoreUserError } = await serviceRole.from('users').insert(backupData.source_user)

      if (restoreUserError) {
        const { error: updateUserError } = await serviceRole
          .from('users')
          .update(backupData.source_user)
          .eq('id', backup.from_user_id)

        if (updateUserError) {
          errors.push(`source user: ${updateUserError.message}`)
        } else {
          stats.source_user_restored = 1
        }
      } else {
        stats.source_user_restored = 1
      }
    } catch (error) {
      errors.push(`source user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      stats.source_user_restored = 0
    }
  }

  await serviceRole
    .from('user_merge_backups')
    .update({
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString(),
    })
    .eq('id', backup.id)

  try {
    const { data: affectedCases } = await serviceRole
      .from('cases')
      .select('id')
      .or(`created_by.eq.${backup.from_user_id},assigned_to.eq.${backup.from_user_id},sponsored_by.eq.${backup.from_user_id}`)

    if (affectedCases && affectedCases.length > 0) {
      for (const caseItem of affectedCases) {
        const { data: caseContributions } = await serviceRole
          .from('contributions')
          .select('amount')
          .eq('case_id', caseItem.id)
          .eq('status', 'approved')

        if (caseContributions) {
          const totalAmount = caseContributions.reduce(
            (sum, c) => sum + parseFloat(c.amount?.toString() || '0'),
            0
          )

          await serviceRole.from('cases').update({ current_amount: totalAmount.toString() }).eq('id', caseItem.id)
        }
      }
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error recalculating case amounts after rollback:', error)
    errors.push(`case amount recalculation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  const totalRestored = Object.values(stats).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val
    return sum
  }, 0)

  const statsOut: UserMergeRollbackStats = {
    ...stats,
    total_records_restored: totalRestored,
    ...(errors.length > 0 ? { errors } : {}),
  }

  return {
    stats: statsOut,
    totalRestored,
    ...(errors.length > 0 ? { warnings: `Some operations had errors: ${errors.join('; ')}` } : {}),
  }
}
