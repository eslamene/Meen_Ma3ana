import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { executeUserMerge } from '@/lib/services/adminUserMergeService'

/**
 * POST /api/admin/users/merge
 * Merge two user accounts - Comprehensive migration of all user-related data
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, logger } = context

  const body = await request.json()
  const { fromUserId, toUserId, deleteSource = false } = body

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
        persistSession: false,
      },
    }
  )

  const { ipAddress, userAgent } = extractRequestInfo(request)

  const result = await executeUserMerge({
    serviceRole: serviceRoleClient,
    fromUserId,
    toUserId,
    deleteSource,
    adminUserId: adminUser.id,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    logger,
    isDevelopment: env.NODE_ENV === 'development',
    afterBackupCreated: async ({ mergeId, backupId, fromUserId: from, toUserId: to, deleteSource: del }) => {
      await AuditService.logAdminAction(
        adminUser.id,
        'admin_user_merge',
        'user',
        from,
        {
          target_user_id: to,
          delete_source: del,
          merge_id: mergeId,
          backup_id: backupId,
        },
        ipAddress,
        userAgent
      )
    },
  })

  return NextResponse.json({
    success: true,
    message: `Successfully merged accounts. ${result.totalRecords} total records reassigned.`,
    merge_id: result.merge_id,
    backup_id: result.backup_id,
    stats: result.stats,
    warnings: result.warnings,
    rollback_info: {
      merge_id: result.merge_id,
      rollback_endpoint: `/api/admin/users/merge/rollback`,
      note: 'Save the merge_id to rollback this operation if needed',
    },
  })
}

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/merge',
})
