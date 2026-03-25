import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { rollbackUserMerge } from '@/lib/services/adminUserMergeService'

/**
 * POST /api/admin/users/merge/rollback
 * Rollback a user merge operation using the backup data
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, logger } = context
  const body = await request.json()
  const { mergeId } = body

  if (!mergeId) {
    throw new ApiError('VALIDATION_ERROR', 'mergeId is required', 400)
  }

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

  const result = await rollbackUserMerge(serviceRoleClient, mergeId, logger)

  return NextResponse.json({
    success: true,
    message: `Rollback completed. ${result.totalRestored} records restored.`,
    stats: result.stats,
    warnings: result.warnings,
  })
}

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users/merge/rollback',
})
