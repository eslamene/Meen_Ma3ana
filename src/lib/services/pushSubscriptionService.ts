/**
 * Push subscriptions and FCM web tokens.
 * Server-side only; pass the appropriate Supabase client (user session or service role).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export class PushSubscriptionService {
  static async upsertSubscription(
    supabase: SupabaseClient,
    userId: string,
    payload: {
      endpoint: string
      p256dh: string
      auth: string
      userAgent: string | null
    }
  ): Promise<void> {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        auth: payload.auth,
        user_agent: payload.userAgent,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,endpoint'
      }
    )

    if (error) {
      defaultLogger.error('Error saving push subscription:', error)
      throw new Error(`Failed to save push subscription: ${error.message}`)
    }
  }

  static async removeSubscription(
    supabase: SupabaseClient,
    userId: string,
    endpoint: string
  ): Promise<void> {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) {
      defaultLogger.error('Error removing push subscription:', error)
      throw new Error(`Failed to remove push subscription: ${error.message}`)
    }
  }

  static async upsertFCMToken(
    supabase: SupabaseClient,
    userId: string,
    payload: {
      fcmToken: string
      deviceId?: string | null
      platform?: string
      userAgent: string | null
    }
  ): Promise<void> {
    const { error } = await supabase.from('fcm_tokens').upsert(
      {
        user_id: userId,
        fcm_token: payload.fcmToken,
        device_id: payload.deviceId ?? null,
        platform: payload.platform || 'web',
        user_agent: payload.userAgent,
        active: true,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,fcm_token'
      }
    )

    if (error) {
      defaultLogger.error('Error saving FCM token:', error)
      throw new Error(`Failed to save FCM token: ${error.message}`)
    }
  }

  static async getActiveFCMTokensByUserId(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)

    if (error) {
      defaultLogger.error('Error listing FCM tokens:', error)
      throw new Error(`Failed to list FCM tokens: ${error.message}`)
    }

    return data || []
  }

  static async getAllActiveFCMTokenUserIds(supabase: SupabaseClient): Promise<{ user_id: string }[]> {
    const { data, error } = await supabase.from('fcm_tokens').select('user_id').eq('active', true)

    if (error) {
      defaultLogger.error('Error counting FCM tokens:', error)
      throw new Error(`Failed to list FCM tokens: ${error.message}`)
    }

    return data || []
  }
}
