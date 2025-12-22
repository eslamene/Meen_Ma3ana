import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * GET /api/admin/users/merge/preview
 * Preview what will be merged before executing the merge
 * 
 * Returns detailed information about:
 * - What data will be migrated
 * - Counts for each table
 * - Potential issues or conflicts
 * - Validation results
 */
async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { logger } = context
  const { searchParams } = new URL(request.url)
  const fromUserId = searchParams.get('fromUserId')
  const toUserId = searchParams.get('toUserId')

  if (!fromUserId || !toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'fromUserId and toUserId are required', 400)
  }

  if (fromUserId === toUserId) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot merge user with itself', 400)
  }

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

    // Verify users exist
    const { data: fromUser, error: fromError } = await serviceRoleClient
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', fromUserId)
      .single()

    if (fromError || !fromUser) {
      throw new ApiError('NOT_FOUND', 'Source user not found', 404)
    }

    const { data: toUser, error: toError } = await serviceRoleClient
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', toUserId)
      .single()

    if (toError || !toUser) {
      throw new ApiError('NOT_FOUND', 'Target user not found', 404)
    }

    // Helper function to count records
    const countRecords = async (
      table: string,
      field: string
    ): Promise<number> => {
      try {
        const { count } = await serviceRoleClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(field, fromUserId)
        return count || 0
      } catch (error) {
        logger.debug(`Error counting ${table}.${field}:`, error)
        return 0
      }
    }

    // Helper function to count records with multiple fields
    const countRecordsMultiple = async (
      table: string,
      fields: string[]
    ): Promise<number> => {
      try {
        let total = 0
        for (const field of fields) {
          const { count } = await serviceRoleClient
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

    // Count all affected records
    const preview = {
      source_user: fromUser,
      target_user: toUser,
      records_to_migrate: {
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
        category_detection_rules: await countRecordsMultiple('category_detection_rules', ['created_by', 'updated_by']),
        landing_stats: await countRecords('landing_stats', 'updated_by'),
        system_config: await countRecords('system_config', 'updated_by'),
        system_content: await countRecords('system_content', 'updated_by'),
        site_activity_logs: await countRecords('site_activity_log', 'user_id'),
        beneficiaries: await countRecords('beneficiaries', 'created_by'),
        beneficiary_documents: await countRecords('beneficiary_documents', 'uploaded_by').catch(() => 0),
        audit_logs: await countRecords('rbac_audit_log', 'user_id').catch(() => 0),
        audit_logs_table: await countRecords('audit_logs', 'user_id').catch(() => 0),
      },
      validation: {
        can_merge: true,
        warnings: [] as string[],
        errors: [] as string[]
      }
    }

    // Calculate total
    const totalRecords = Object.values(preview.records_to_migrate).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    )

    // Validation checks
    if (totalRecords === 0) {
      preview.validation.warnings.push('No records found to migrate. The source user has no associated data.')
    }

    // Check if target user is active
    const { data: targetUserFull } = await serviceRoleClient
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

    // Check for potential conflicts (e.g., both users have contributions to same case)
    const { data: sourceContributions } = await serviceRoleClient
      .from('contributions')
      .select('case_id')
      .eq('donor_id', fromUserId)
      .not('case_id', 'is', null)

    const { data: targetContributions } = await serviceRoleClient
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

    return NextResponse.json({
      success: true,
      preview,
      summary: {
        total_records_to_migrate: totalRecords,
        tables_affected: Object.entries(preview.records_to_migrate)
          .filter(([_, count]) => count > 0)
          .map(([table]) => table),
        validation_passed: preview.validation.errors.length === 0,
        has_warnings: preview.validation.warnings.length > 0
      }
    })
}

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users/merge/preview' 
})




