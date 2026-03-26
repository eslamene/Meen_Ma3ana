import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { PushSubscriptionService } from '@/lib/services/pushSubscriptionService'
import { publicAssets } from '@/config/public-assets'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const diagnostics: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      checks: {}
    }

    try {
      if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        ;(diagnostics.checks as Record<string, unknown>).fcmTokens = {
          status: 'error',
          message: 'SUPABASE_SERVICE_ROLE_KEY not configured'
        }
      } else {
        const supabaseClient = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        try {
          const userTokens = await PushSubscriptionService.getActiveFCMTokensByUserId(supabaseClient, user.id)

          ;(diagnostics.checks as Record<string, unknown>).fcmTokens = {
            status: userTokens && userTokens.length > 0 ? 'ok' : 'warning',
            count: userTokens?.length || 0,
            tokens:
              userTokens?.map((t) => ({
                id: t.id,
                platform: t.platform,
                deviceId: t.device_id,
                createdAt: t.created_at,
                updatedAt: t.updated_at
              })) || [],
            message:
              userTokens && userTokens.length > 0
                ? `Found ${userTokens.length} active token(s)`
                : 'No active FCM tokens found. Please subscribe to push notifications.'
          }
        } catch (tokensError: unknown) {
          const message = tokensError instanceof Error ? tokensError.message : 'Unknown error'
          ;(diagnostics.checks as Record<string, unknown>).fcmTokens = {
            status: 'error',
            message,
            error: tokensError
          }
        }

        try {
          const allTokens = await PushSubscriptionService.getAllActiveFCMTokenUserIds(supabaseClient)
          ;(diagnostics.checks as Record<string, unknown>).totalActiveTokens = {
            status: 'ok',
            count: allTokens?.length || 0,
            message: `Total active tokens in system: ${allTokens?.length || 0}`
          }
        } catch (allTokensError: unknown) {
          const message = allTokensError instanceof Error ? allTokensError.message : 'Unknown error'
          ;(diagnostics.checks as Record<string, unknown>).totalActiveTokens = {
            status: 'error',
            message
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error checking FCM tokens'
      ;(diagnostics.checks as Record<string, unknown>).fcmTokens = {
        status: 'error',
        message
      }
    }

    ;(diagnostics.checks as Record<string, unknown>).edgeFunction = {
      status: 'info',
      message: 'Edge Function secret check requires manual verification',
      instructions: [
        '1. Run: supabase secrets list',
        '2. Verify FIREBASE_SERVICE_ACCOUNT_JSON is set',
        '3. Check Edge Function logs: supabase functions logs push-fcm'
      ]
    }

    try {
      const edgeFunctionUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-fcm`
      const testResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userIds: [user.id],
          notification: {
            title: 'Diagnostic Test',
            body: 'This is a diagnostic test notification',
            icon: publicAssets.brand.logo,
            badge: publicAssets.brand.logo
          },
          data: {
            type: 'diagnostic',
            timestamp: new Date().toISOString()
          }
        })
      })

      const testResult = await testResponse.json().catch(() => ({ error: 'Failed to parse response' }))

      ;(diagnostics.checks as Record<string, unknown>).edgeFunctionTest = {
        status: testResponse.ok ? 'ok' : 'error',
        httpStatus: testResponse.status,
        response: testResult,
        message: testResponse.ok
          ? 'Edge Function responded successfully'
          : `Edge Function error: ${(testResult as { error?: string }).error || (testResult as { message?: string }).message || 'Unknown error'}`
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to test Edge Function'
      ;(diagnostics.checks as Record<string, unknown>).edgeFunctionTest = {
        status: 'error',
        message,
        error: String(error)
      }
    }

    ;(diagnostics.checks as Record<string, unknown>).environment = {
      status: 'ok',
      variables: {
        hasSupabaseUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL
          ? `${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...`
          : 'not set'
      },
      message: 'Environment variables check'
    }

    return NextResponse.json(diagnostics)
  } catch (error: unknown) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error running diagnostics:', error)
    return NextResponse.json(
      {
        error: 'Failed to run diagnostics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(getHandler, {
  requireAuth: true,
  loggerContext: 'api/push/diagnostics'
})
