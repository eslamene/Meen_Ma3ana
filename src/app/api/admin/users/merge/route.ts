import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * POST /api/admin/users/merge
 * Merge two user accounts - Comprehensive migration of all user-related data
 * 
 * This will reassign ALL user-related data from source user to target user:
 * 1. Contributions (donor_id)
 * 2. Notifications (recipient_id)
 * 3. Recurring contributions (donor_id)
 * 4. Sponsorships (sponsor_id)
 * 5. Communications (sender_id, recipient_id)
 * 6. Cases (created_by, assigned_to, sponsored_by)
 * 7. Case status history (changed_by)
 * 8. Case updates (created_by)
 * 9. Projects (created_by, assigned_to)
 * 10. Contribution approval status (admin_id)
 * 11. Category detection rules (created_by, updated_by)
 * 12. Landing stats (updated_by)
 * 13. System config (updated_by)
 * 14. System content (updated_by)
 * 15. Site activity logs (user_id)
 * 16. Beneficiaries (created_by)
 * 17. Beneficiary documents (uploaded_by)
 * 18. Audit logs (user_id)
 * 19. Optionally delete the source user account
 */
async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { user: adminUser, supabase, logger } = context
  
  // Declare backupId at function scope so it's accessible in catch block
  let backupId: string | null = null

  const body = await request.json()
  const { fromUserId, toUserId, deleteSource = false } = body

  if (!fromUserId || !toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'fromUserId and toUserId are required', 400)
  }

  if (fromUserId === toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot merge user with itself', 400)
  }

  try {
    // Extract request info for logging
    const { ipAddress, userAgent } = extractRequestInfo(request)

    // Create service role client for admin operations (bypasses RLS)
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

    // Verify users exist
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

    // Generate unique merge ID for this operation
    const mergeId = crypto.randomUUID()

    // STEP 1: Create backup before merge
    logger.info('Creating backup before merge', { mergeId, fromUserId, toUserId })
    
    try {
      // Try to call the backup function
      const { data: backupResult, error: backupError } = await serviceRoleClient.rpc(
        'create_user_merge_backup',
        {
          p_merge_id: mergeId,
          p_from_user_id: fromUserId,
          p_to_user_id: toUserId,
          p_admin_user_id: adminUser.id,
          p_delete_source: deleteSource,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null
        }
      )

      if (backupError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to create backup:', {
          error: backupError,
          message: backupError.message,
          code: backupError.code,
          hint: backupError.hint,
          details: backupError.details
        })
        
        // Check if it's a "function does not exist" error
        if (backupError.message?.includes('does not exist') || backupError.code === '42883') {
          return NextResponse.json(
            { 
              error: 'Backup system not initialized. Please run migration 078_create_user_merge_backup_system.sql first.',
              details: backupError.message,
              migration_required: true
            },
            { status: 500 }
          )
        }
        
        // Return detailed error information
        return NextResponse.json(
          { 
            error: 'Failed to create backup before merge. Operation aborted for safety.',
            details: backupError.message || 'Unknown error',
            error_code: backupError.code,
            hint: backupError.hint,
            full_error: env.NODE_ENV === 'development' ? JSON.stringify(backupError, null, 2) : undefined
          },
          { status: 500 }
        )
      }

      backupId = backupResult as string
      logger.info('Backup created successfully', { mergeId, backupId })
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Exception creating backup:', error)
      
      // Check if it's a function not found error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('does not exist') || errorMessage.includes('function')) {
        return NextResponse.json(
          { 
            error: 'Backup system not initialized. Please run migration 078_create_user_merge_backup_system.sql first.',
            details: errorMessage,
            migration_required: true
          },
          { status: 500 }
        )
      }
      
      // If backup fails, we should abort the merge for safety
      return NextResponse.json(
        { 
          error: 'Failed to create backup before merge. Operation aborted for safety.',
          details: errorMessage,
          note: 'The merge operation requires a backup to be created first. Please ensure migration 078_create_user_merge_backup_system.sql has been applied.'
        },
        { status: 500 }
      )
    }

    // Log the admin action (after backup is created)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_merge',
      'user',
      fromUserId,
      { 
        target_user_id: toUserId, 
        delete_source: deleteSource,
        merge_id: mergeId,
        backup_id: backupId
      },
      ipAddress,
      userAgent
    )

    const now = new Date().toISOString()
    const stats: Record<string, number> = {}
    const errors: string[] = []

    // Helper function to safely update and count
    const updateAndCount = async (
      table: string,
      field: string,
      description: string
    ): Promise<number> => {
      try {
        // Count before update
        const { count } = await serviceRoleClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(field, fromUserId)

        const countValue = count || 0

        if (countValue > 0) {
          // Update records
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

    // Helper function to update multiple fields in a table
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
              logger.logStableError('INTERNAL_SERVER_ERROR', `Error reassigning ${description} (${field}):`, error)
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

    // Step 1: Reassign contributions
    stats.contributions = await updateAndCount('contributions', 'donor_id', 'contributions')

    // Step 2: Reassign notifications
    stats.notifications = await updateAndCount('notifications', 'recipient_id', 'notifications')

    // Step 3: Reassign recurring contributions
    stats.recurring_contributions = await updateAndCount('recurring_contributions', 'donor_id', 'recurring contributions')

    // Step 4: Reassign sponsorships
    stats.sponsorships = await updateAndCount('sponsorships', 'sponsor_id', 'sponsorships')

    // Step 5: Reassign communications (both sender and recipient)
    stats.communications = await updateMultipleFields('communications', ['sender_id', 'recipient_id'], 'communications')

    // Step 6: Reassign cases (created_by, assigned_to, sponsored_by)
    stats.cases = await updateMultipleFields('cases', ['created_by', 'assigned_to', 'sponsored_by'], 'cases')

    // Step 7: Reassign case status history
    stats.case_status_history = await updateAndCount('case_status_history', 'changed_by', 'case status history')

    // Step 8: Reassign case updates
    stats.case_updates = await updateAndCount('case_updates', 'created_by', 'case updates')

    // Step 9: Reassign projects (created_by, assigned_to)
    stats.projects = await updateMultipleFields('projects', ['created_by', 'assigned_to'], 'projects')

    // Step 10: Reassign contribution approval status
    stats.contribution_approval_status = await updateAndCount('contribution_approval_status', 'admin_id', 'contribution approval status')

    // Step 11: Reassign category detection rules (created_by, updated_by)
    stats.category_detection_rules = await updateMultipleFields('category_detection_rules', ['created_by', 'updated_by'], 'category detection rules')

    // Step 12: Reassign landing stats
    stats.landing_stats = await updateAndCount('landing_stats', 'updated_by', 'landing stats')

    // Step 13: Reassign system config
    stats.system_config = await updateAndCount('system_config', 'updated_by', 'system config')

    // Step 14: Reassign system content
    stats.system_content = await updateAndCount('system_content', 'updated_by', 'system content')

    // Step 15: Reassign site activity logs
    stats.site_activity_logs = await updateAndCount('site_activity_log', 'user_id', 'site activity logs')

    // Step 16: Reassign beneficiaries (created_by)
    stats.beneficiaries = await updateAndCount('beneficiaries', 'created_by', 'beneficiaries')

    // Step 17: Reassign beneficiary documents (uploaded_by)
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

    // Step 18: Reassign audit logs (rbac_audit_log)
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

    // Step 19: Reassign audit_logs (if table exists)
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
      // Table might not exist, which is fine
      logger.debug('audit_logs table not found or error:', error)
      stats.audit_logs_table = 0
    }

    // Step 20: Recalculate case amounts for affected cases
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

    // Step 21: Optionally delete source user
    if (deleteSource) {
      try {
        // Delete from users table
        const { error: deleteError } = await serviceRoleClient
          .from('users')
          .delete()
          .eq('id', fromUserId)

        if (deleteError) {
          logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting source user:', deleteError)
          errors.push(`delete user: ${deleteError.message}`)
        } else {
          // Also delete from auth if possible
          try {
            await serviceRoleClient.auth.admin.deleteUser(fromUserId)
            stats.source_user_deleted = 1
          } catch (authDeleteError) {
            logger.warn('Could not delete auth user:', authDeleteError)
            errors.push(`delete auth user: ${authDeleteError instanceof Error ? authDeleteError.message : 'Unknown error'}`)
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

    // Calculate total records migrated
    const totalRecords = Object.values(stats).reduce((sum, val) => {
      if (typeof val === 'number') return sum + val
      return sum
    }, 0)

    // Update backup status to completed
    try {
      await serviceRoleClient
        .from('user_merge_backups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_records_migrated: totalRecords,
          errors: errors.length > 0 ? errors : null
        })
        .eq('id', backupId)
    } catch (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to update backup status:', error)
      // Don't fail the merge if backup status update fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged accounts. ${totalRecords} total records reassigned.`,
      merge_id: mergeId,
      backup_id: backupId,
      stats: {
        ...stats,
        total_records_migrated: totalRecords,
        errors: errors.length > 0 ? errors : undefined
      },
      warnings: errors.length > 0 ? `Some operations had errors: ${errors.join('; ')}` : undefined,
      rollback_info: {
        merge_id: mergeId,
        rollback_endpoint: `/api/admin/users/merge/rollback`,
        note: 'Save the merge_id to rollback this operation if needed'
      }
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Account merge API error', { error })
    
    // If we have a backup_id, mark it as failed
    if (backupId) {
      try {
        if (!env.SUPABASE_SERVICE_ROLE_KEY) {
          logger.error('SUPABASE_SERVICE_ROLE_KEY is required for rollback')
          // Continue without marking backup as failed
        } else {
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
          await serviceRoleClient
            .from('user_merge_backups')
            .update({
              status: 'failed',
              errors: [error instanceof Error ? error.message : 'Unknown error']
            })
            .eq('id', backupId)
        }
      } catch (updateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Failed to update backup status to failed', { error: updateError })
      }
    }
    
    // Throw ApiError with backupId in details for proper error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const apiError = new ApiError('INTERNAL_SERVER_ERROR', `Failed to merge accounts: ${errorMessage}`, 500)
    // Include backupId in error details
    if (backupId) {
      apiError.details = {
        backup_id: backupId,
        note: 'A backup was created. You may need to manually verify data integrity.'
      }
    }
    throw apiError
  }
}

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/merge' 
})

