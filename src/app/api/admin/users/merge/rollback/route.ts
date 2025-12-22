import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * POST /api/admin/users/merge/rollback
 * Rollback a user merge operation using the backup data
 * 
 * This will restore all data that was migrated during the merge
 */
async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { user: adminUser, logger } = context
  const body = await request.json()
  const { mergeId } = body

  if (!mergeId) {
    throw new ApiError('VALIDATION_ERROR', 'mergeId is required', 400)
  }

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_merge_rollback',
      'user_merge_backup',
      mergeId,
      { merge_id: mergeId },
      ipAddress,
      userAgent
    )

    // Create service role client for admin operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }
    
    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get backup record
    const { data: backup, error: backupError } = await serviceRoleClient
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
      throw new ApiError('VALIDATION_ERROR', `Cannot rollback merge with status: ${backup.status}. Only completed merges can be rolled back.`, 400)
    }

    const backupData = backup.backup_data as Record<string, Array<{ id: string; [key: string]: unknown }>>
    const stats: Record<string, number> = {}
    const errors: string[] = []

    // Helper function to restore records
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
          const { error } = await serviceRoleClient
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

    // Restore contributions
    if (backupData.contributions) {
      stats.contributions = await restoreRecords('contributions', 'donor_id', backupData.contributions, 'contributions')
    }

    // Restore notifications
    if (backupData.notifications) {
      stats.notifications = await restoreRecords('notifications', 'recipient_id', backupData.notifications, 'notifications')
    }

    // Restore recurring contributions
    if (backupData.recurring_contributions) {
      stats.recurring_contributions = await restoreRecords('recurring_contributions', 'donor_id', backupData.recurring_contributions, 'recurring contributions')
    }

    // Restore sponsorships
    if (backupData.sponsorships) {
      stats.sponsorships = await restoreRecords('sponsorships', 'sponsor_id', backupData.sponsorships, 'sponsorships')
    }

    // Restore communications
    if (backupData.communications) {
      for (const comm of backupData.communications) {
        try {
          const field = comm.sender_id === backup.to_user_id ? 'sender_id' : 'recipient_id'
          const { error } = await serviceRoleClient
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

    // Restore cases
    if (backupData.cases) {
      for (const caseRecord of backupData.cases) {
        try {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (caseRecord.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
          if (caseRecord.assigned_to === backup.to_user_id) updates.assigned_to = backup.from_user_id
          if (caseRecord.sponsored_by === backup.to_user_id) updates.sponsored_by = backup.from_user_id

          if (Object.keys(updates).length > 1) {
            const { error } = await serviceRoleClient
              .from('cases')
              .update(updates)
              .eq('id', caseRecord.id)

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

    // Restore case status history
    if (backupData.case_status_history) {
      stats.case_status_history = await restoreRecords('case_status_history', 'changed_by', backupData.case_status_history, 'case status history')
    }

    // Restore case updates
    if (backupData.case_updates) {
      stats.case_updates = await restoreRecords('case_updates', 'created_by', backupData.case_updates, 'case updates')
    }

    // Restore projects
    if (backupData.projects) {
      for (const project of backupData.projects) {
        try {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (project.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
          if (project.assigned_to === backup.to_user_id) updates.assigned_to = backup.from_user_id

          if (Object.keys(updates).length > 1) {
            const { error } = await serviceRoleClient
              .from('projects')
              .update(updates)
              .eq('id', project.id)

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

    // Restore contribution approval status
    if (backupData.contribution_approval_status) {
      stats.contribution_approval_status = await restoreRecords('contribution_approval_status', 'admin_id', backupData.contribution_approval_status, 'contribution approval status')
    }

    // Restore category detection rules
    if (backupData.category_detection_rules) {
      for (const rule of backupData.category_detection_rules) {
        try {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (rule.created_by === backup.to_user_id) updates.created_by = backup.from_user_id
          if (rule.updated_by === backup.to_user_id) updates.updated_by = backup.from_user_id

          if (Object.keys(updates).length > 1) {
            const { error } = await serviceRoleClient
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

    // Restore landing stats
    if (backupData.landing_stats) {
      stats.landing_stats = await restoreRecords('landing_stats', 'updated_by', backupData.landing_stats, 'landing stats')
    }

    // Restore system config
    if (backupData.system_config) {
      stats.system_config = await restoreRecords('system_config', 'updated_by', backupData.system_config, 'system config')
    }

    // Restore system content
    if (backupData.system_content) {
      stats.system_content = await restoreRecords('system_content', 'updated_by', backupData.system_content, 'system content')
    }

    // Restore beneficiaries
    if (backupData.beneficiaries) {
      stats.beneficiaries = await restoreRecords('beneficiaries', 'created_by', backupData.beneficiaries, 'beneficiaries')
    }

    // Restore beneficiary documents
    if (backupData.beneficiary_documents) {
      stats.beneficiary_documents = await restoreRecords('beneficiary_documents', 'uploaded_by', backupData.beneficiary_documents, 'beneficiary documents')
    }

    // Restore source user if it was deleted
    if (backup.delete_source && backupData.source_user) {
      try {
        const { error: restoreUserError } = await serviceRoleClient
          .from('users')
          .insert(backupData.source_user)

        if (restoreUserError) {
          // User might already exist, try update instead
          const { error: updateUserError } = await serviceRoleClient
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

    // Update backup status
    await serviceRoleClient
      .from('user_merge_backups')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString()
      })
      .eq('id', backup.id)

    // Recalculate case amounts
    try {
      const { data: affectedCases } = await serviceRoleClient
        .from('cases')
        .select('id')
        .or(`created_by.eq.${backup.from_user_id},assigned_to.eq.${backup.from_user_id},sponsored_by.eq.${backup.from_user_id}`)

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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error recalculating case amounts after rollback:', error)
      errors.push(`case amount recalculation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const totalRestored = Object.values(stats).reduce((sum, val) => {
      if (typeof val === 'number') return sum + val
      return sum
    }, 0)

    return NextResponse.json({
      success: true,
      message: `Rollback completed. ${totalRestored} records restored.`,
      stats: {
        ...stats,
        total_records_restored: totalRestored,
        errors: errors.length > 0 ? errors : undefined
      },
      warnings: errors.length > 0 ? `Some operations had errors: ${errors.join('; ')}` : undefined
    })
}

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/merge/rollback' 
})

