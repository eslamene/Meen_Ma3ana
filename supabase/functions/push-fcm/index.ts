// Supabase Edge Function for Firebase Cloud Messaging (FCM) Push Notifications
// Uses Firebase Cloud Messaging API (V1) - Recommended approach
// Based on: https://firebase.google.com/docs/cloud-messaging/migrate-v1
//
// Note: This file uses Deno runtime APIs. Linter errors for Deno types and npm: imports
// are expected and can be ignored - the code runs correctly in Supabase Edge Functions.

// Type declaration for Deno global (Supabase Edge Functions run on Deno runtime)
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (req: Request) => Promise<Response> | Response): void
}

// @ts-ignore - Deno npm: imports are valid at runtime but not recognized by TypeScript
import { createClient } from 'npm:@supabase/supabase-js@2'
// @ts-ignore - Deno URL imports are valid at runtime but not recognized by TypeScript
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'meenma3ana-c6520'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface FCMNotification {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
}

interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

interface V1Message {
  token: string
  notification?: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  android?: {
    priority: 'normal' | 'high'
    notification?: {
      sound?: string
      click_action?: string
    }
  }
  webpush?: {
    notification?: {
      title: string
      body: string
      icon?: string
      badge?: string
      requireInteraction?: boolean
    }
    fcm_options?: {
      link?: string
    }
  }
  apns?: {
    headers?: {
      'apns-priority': string
    }
    payload?: {
      aps?: {
        sound?: string
        badge?: number
      }
    }
  }
}

/**
 * Get OAuth2 access token from Service Account
 */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  // Import the private key
  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n')
  
  // Extract the key data (remove headers and whitespace)
  let keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/\s/g, '')

  // Convert base64 to ArrayBuffer
  try {
    const binaryString = atob(keyData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Import the key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )

    // Create JWT payload
    const now = getNumericDate(new Date())
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }

    // Create and sign JWT
    const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, key)

    // Exchange JWT for access token
    const tokenResponse = await fetch(serviceAccount.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error('Access token not found in response')
    }
    return tokenData.access_token
  } catch (error) {
    if (error instanceof Error) {
      // Preserve original error message if it's already descriptive
      if (error.message.includes('Failed to get access token')) {
        throw error
      }
      throw new Error(`Failed to get OAuth2 access token: ${error.message}`)
    }
    throw new Error('Failed to get OAuth2 access token: Unknown error')
  }
}

/**
 * Send a single message using FCM V1 API
 */
async function sendV1Message(
  accessToken: string,
  token: string,
  notification: FCMNotification,
  notificationData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const message: V1Message = {
    token,
    notification: {
      title: notification.title,
      body: notification.body,
      image: notification.icon,
    },
    data: notificationData
      ? Object.fromEntries(
          Object.entries(notificationData).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ])
        )
      : undefined,
    android: {
      priority: notification.requireInteraction ? 'high' : 'normal',
      notification: {
        sound: 'default',
        click_action: notificationData?.url || '/',
      },
    },
    webpush: {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/logo.png',
        badge: notification.badge || '/logo.png',
        requireInteraction: notification.requireInteraction,
      },
      fcm_options: {
        link: notificationData?.url || '/',
      },
    },
  }

  const url = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
    return {
      success: false,
      error: errorData.error?.message || `HTTP ${response.status}`,
    }
  }

  return { success: true }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    let requestBody: {
      userIds?: string[]
      notification: FCMNotification
      data?: Record<string, any>
    }
    
    try {
      requestBody = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { userIds, notification, data: notificationData } = requestBody

    // Parse Service Account JSON
    let serviceAccount: ServiceAccount
    try {
      serviceAccount = JSON.parse(firebaseServiceAccountJson)
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error)
      return new Response(
        JSON.stringify({
          error: 'Firebase service account not configured',
          message: 'FIREBASE_SERVICE_ACCOUNT_JSON must be a valid JSON string',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!notification || !notification.title || !notification.body) {
      return new Response(
        JSON.stringify({ error: 'Notification title and body are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get OAuth2 access token
    let accessToken: string
    try {
      accessToken = await getAccessToken(serviceAccount)
    } catch (error) {
      console.error('Failed to get access token:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to authenticate with Firebase',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch FCM tokens
    let fcmTokens: string[] = []

    if (userIds && userIds.length > 0) {
      // Fetch FCM tokens for specific users
      console.log(`Fetching FCM tokens for ${userIds.length} user(s):`, userIds)
      
      const { data: subscriptions, error } = await supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, active')
        .in('user_id', userIds)
        .eq('active', true)
        .not('fcm_token', 'is', null)

      if (error) {
        console.error('Error fetching FCM tokens:', error)
        const errorMessage = error.message || String(error)
        if (
          errorMessage.includes('does not exist') ||
          (errorMessage.includes('relation') && errorMessage.includes('fcm_tokens'))
        ) {
          return new Response(
            JSON.stringify({
              error: 'FCM tokens table does not exist',
              message: 'Please run migration 1013_add_fcm_tokens.sql to create the fcm_tokens table',
              details: errorMessage,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch FCM tokens',
            message: errorMessage,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      console.log(`Found ${subscriptions?.length || 0} active FCM token(s) for user(s)`)
      if (subscriptions && subscriptions.length > 0) {
        console.log('Token user IDs:', subscriptions.map((s: any) => s.user_id))
      } else {
        console.log('No active tokens found. Checking all tokens for these users...')
        // Debug: Check if tokens exist but are inactive
        const { data: allTokens } = await supabase
          .from('fcm_tokens')
          .select('user_id, active, fcm_token')
          .in('user_id', userIds)
        console.log('All tokens (including inactive):', allTokens?.length || 0)
        if (allTokens && allTokens.length > 0) {
          console.log('Token details:', allTokens.map((t: any) => ({
            userId: t.user_id,
            active: t.active,
            hasToken: !!t.fcm_token
          })))
        }
      }

      fcmTokens = (subscriptions || [])
        .map((sub: { fcm_token: string }) => sub.fcm_token)
        .filter((token: string) => token && token.length > 0)
      
      console.log(`Extracted ${fcmTokens.length} valid FCM token(s)`)
    } else {
      // Fetch all active FCM tokens (broadcast)
      const { data: subscriptions, error } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .eq('active', true)
        .not('fcm_token', 'is', null)

      if (error) {
        console.error('Error fetching all FCM tokens:', error)
        const errorMessage = error.message || String(error)
        if (
          errorMessage.includes('does not exist') ||
          (errorMessage.includes('relation') && errorMessage.includes('fcm_tokens'))
        ) {
          return new Response(
            JSON.stringify({
              error: 'FCM tokens table does not exist',
              message: 'Please run migration 1013_add_fcm_tokens.sql to create the fcm_tokens table',
              details: errorMessage,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch FCM tokens',
            message: errorMessage,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      fcmTokens = (subscriptions || [])
        .map((sub: { fcm_token: string }) => sub.fcm_token)
        .filter((token: string) => token && token.length > 0)
    }

    if (fcmTokens.length === 0) {
      console.warn('No FCM tokens found for notification')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No active FCM tokens found',
          tokensCount: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Sending FCM notification to ${fcmTokens.length} tokens using V1 API`)

    // Send messages (V1 API sends one at a time)
    let successCount = 0
    let failureCount = 0
    const invalidTokens: string[] = []

    for (const token of fcmTokens) {
      try {
        const result = await sendV1Message(accessToken, token, notification, notificationData)
        if (result.success) {
          successCount++
        } else {
          failureCount++
          // Check if token is invalid
          if (
            result.error?.includes('NOT_FOUND') ||
            result.error?.includes('INVALID_ARGUMENT') ||
            result.error?.includes('UNREGISTERED')
          ) {
            invalidTokens.push(token)
          }
          console.error(`FCM error for token:`, result.error)
        }
      } catch (error) {
        failureCount++
        console.error(`FCM error for token:`, error)
      }
    }

    // Remove invalid tokens from database
    if (invalidTokens.length > 0) {
      console.log(`Removing ${invalidTokens.length} invalid FCM tokens`)
      const { error: updateError } = await supabase
        .from('fcm_tokens')
        .update({ active: false })
        .in('fcm_token', invalidTokens)
      
      if (updateError) {
        console.error('Failed to deactivate invalid tokens:', updateError)
      }
    }

    console.log(`FCM notification sent: ${successCount} success, ${failureCount} failures`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        total: fcmTokens.length,
        invalidTokensRemoved: invalidTokens.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in push-fcm function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
