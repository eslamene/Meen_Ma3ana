import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user, logger } = context

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      checks: {},
    }

    // Check 1: FCM tokens in database
    try {
      if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        diagnostics.checks.fcmTokens = {
          status: 'error',
          message: 'SUPABASE_SERVICE_ROLE_KEY not configured',
        }
      } else {
        const supabaseClient = createSupabaseClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )

        const { data: userTokens, error: tokensError } = await supabaseClient
          .from('fcm_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)

        if (tokensError) {
          diagnostics.checks.fcmTokens = {
            status: 'error',
            message: tokensError.message,
            error: tokensError,
          }
        } else {
          diagnostics.checks.fcmTokens = {
            status: userTokens && userTokens.length > 0 ? 'ok' : 'warning',
            count: userTokens?.length || 0,
            tokens: userTokens?.map((t) => ({
              id: t.id,
              platform: t.platform,
              deviceId: t.device_id,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
            })) || [],
            message:
              userTokens && userTokens.length > 0
                ? `Found ${userTokens.length} active token(s)`
                : 'No active FCM tokens found. Please subscribe to push notifications.',
          }
        }

        // Check total active tokens
        const { data: allTokens, error: allTokensError } = await supabaseClient
          .from('fcm_tokens')
          .select('user_id')
          .eq('active', true)

        diagnostics.checks.totalActiveTokens = {
          status: allTokensError ? 'error' : 'ok',
          count: allTokens?.length || 0,
          message: allTokensError
            ? allTokensError.message
            : `Total active tokens in system: ${allTokens?.length || 0}`,
        }
      }
    } catch (error: any) {
      diagnostics.checks.fcmTokens = {
        status: 'error',
        message: error.message || 'Unknown error checking FCM tokens',
      }
    }

    // Check 2: Edge Function configuration (we can't directly check secrets, but we can test the function)
    diagnostics.checks.edgeFunction = {
      status: 'info',
      message: 'Edge Function secret check requires manual verification',
      instructions: [
        '1. Run: supabase secrets list',
        '2. Verify FIREBASE_SERVICE_ACCOUNT_JSON is set',
        '3. Check Edge Function logs: supabase functions logs push-fcm',
      ],
    }

    // Check 3: Test Edge Function call
    try {
      const edgeFunctionUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-fcm`
      const testResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userIds: [user.id],
          notification: {
            title: 'Diagnostic Test',
            body: 'This is a diagnostic test notification',
            icon: '/logo.png',
            badge: '/logo.png',
          },
          data: {
            type: 'diagnostic',
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const testResult = await testResponse.json().catch(() => ({ error: 'Failed to parse response' }))

      diagnostics.checks.edgeFunctionTest = {
        status: testResponse.ok ? 'ok' : 'error',
        httpStatus: testResponse.status,
        response: testResult,
        message: testResponse.ok
          ? 'Edge Function responded successfully'
          : `Edge Function error: ${testResult.error || testResult.message || 'Unknown error'}`,
      }
    } catch (error: any) {
      diagnostics.checks.edgeFunctionTest = {
        status: 'error',
        message: error.message || 'Failed to test Edge Function',
        error: error.toString(),
      }
    }

    // Check 4: Environment variables
    diagnostics.checks.environment = {
      status: 'ok',
      variables: {
        hasSupabaseUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL
          ? `${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...`
          : 'not set',
      },
      message: 'Environment variables check',
    }

    return NextResponse.json(diagnostics)
  } catch (error: any) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error running diagnostics:', error)
    return NextResponse.json(
      {
        error: 'Failed to run diagnostics',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(getHandler, {
  requireAuth: true,
  loggerContext: 'api/push/diagnostics',
})

