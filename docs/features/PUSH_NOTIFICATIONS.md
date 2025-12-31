# Push Notifications Setup Guide

Complete guide for setting up and using Firebase Cloud Messaging (FCM) push notifications in Meen Ma3ana.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Firebase Setup](#firebase-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Supabase Edge Function](#supabase-edge-function)
8. [Client-Side Setup](#client-side-setup)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

## Overview

The push notification system sends browser push notifications to users when:
- **A new case is created**: All users receive notifications
- **A case is updated**: Only users who have contributed to that case receive notifications
- **Case status changes**: Creator and contributors receive notifications
- **Case is completed**: All users receive notifications

## Architecture

- **Client-side**: Registers FCM tokens using Firebase SDK (`useFCMNotifications` hook)
- **Server-side**: Uses Supabase Edge Function to send notifications via **FCM V1 API** (recommended by Google)
- **Database**: Stores FCM tokens in `fcm_tokens` table
- **Service Worker**: Handles background notifications (`public/firebase-messaging-sw.js`)
- **API Version**: Uses FCM V1 API with OAuth2 Service Account authentication (not Legacy API)

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Supabase Project**: Your Supabase project with Edge Functions enabled
3. **HTTPS or Localhost**: Push notifications require HTTPS (except for localhost)

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Project name: `meenma3ana-c6520` (or your project name)

### Step 2: Enable Cloud Messaging API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: `meenma3ana-c6520`
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Firebase Cloud Messaging API"**
5. Click **Enable** (if not already enabled)

**Note**: We use the **V1 API** (not Legacy API) which is the recommended approach by Google.

### Step 3: Create Service Account

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on the **Service Accounts** tab
3. Click **Generate New Private Key**
4. A JSON file will be downloaded - this is your Service Account credentials
5. **Important**: Keep this file secure and never commit it to version control

**Note**: The Service Account JSON will be used as `FIREBASE_SERVICE_ACCOUNT_JSON` secret in Supabase Edge Functions.

For detailed setup instructions, see: `scripts/setup-v1-api-secrets.md`

### Step 4: Get Firebase Web App Configuration

1. In Firebase Console, go to **Project Settings** > **General**
2. Scroll down to "Your apps" and click the web icon (`</>`)
3. Register your app (if not already registered)
4. Copy the Firebase configuration object

The config should look like:
```json
{
  "apiKey": "AIzaSyBTysTBlLPcstq7uWonnu3YTkKIVLleueM",
  "authDomain": "meenma3ana-c6520.firebaseapp.com",
  "projectId": "meenma3ana-c6520",
  "storageBucket": "meenma3ana-c6520.firebasestorage.app",
  "messagingSenderId": "51219462930",
  "appId": "1:51219462930:web:9f22cd938ecdbabc2c91cb",
  "measurementId": "G-M3PN8ZQNNV"
}
```

## Environment Configuration

### Client-Side Environment Variables (.env)

Add these to your `.env` file:

```env
# Firebase Web App Configuration (JSON string)
# IMPORTANT: Must be a JSON string, not a JSON object
# Wrap the entire JSON object in single quotes
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"AIzaSyBTysTBlLPcstq7uWonnu3YTkKIVLleueM","authDomain":"meenma3ana-c6520.firebaseapp.com","projectId":"meenma3ana-c6520","storageBucket":"meenma3ana-c6520.firebasestorage.app","messagingSenderId":"51219462930","appId":"1:51219462930:web:9f22cd938ecdbabc2c91cb","measurementId":"G-M3PN8ZQNNV"}'

# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Complete .env Example

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase Web App Configuration (for client-side)
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"AIzaSyBTysTBlLPcstq7uWonnu3YTkKIVLleueM","authDomain":"meenma3ana-c6520.firebaseapp.com","projectId":"meenma3ana-c6520","storageBucket":"meenma3ana-c6520.firebasestorage.app","messagingSenderId":"51219462930","appId":"1:51219462930:web:9f22cd938ecdbabc2c91cb","measurementId":"G-M3PN8ZQNNV"}'

# Other environment variables
NODE_ENV=development
```

### Important Notes

- **NEXT_PUBLIC_FIREBASE_CONFIG**: Must be a JSON string (wrapped in single quotes), not a JSON object
- The Firebase config is already hardcoded in `src/lib/firebase.ts`, but you can override it with `NEXT_PUBLIC_FIREBASE_CONFIG` if needed
- **Service Account JSON**: This is set as a secret in Supabase Edge Functions (not in `.env`), see [Supabase Edge Function Setup](#supabase-edge-function)

## Database Setup

### Apply Migration

Apply the migration to create the `fcm_tokens` table:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard SQL editor
# Copy contents of supabase/migrations/1013_add_fcm_tokens.sql
```

### Database Schema

The `fcm_tokens` table stores:
- `id`: UUID primary key
- `user_id`: Reference to users table
- `fcm_token`: Firebase Cloud Messaging token
- `device_id`: Optional device identifier
- `platform`: 'web', 'android', or 'ios'
- `user_agent`: Browser information
- `active`: Boolean flag for active tokens
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Supabase Edge Function

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

### Step 3: Deploy the Edge Function

```bash
supabase functions deploy push-fcm
```

### Step 4: Set Environment Secrets

The Edge Function uses **FCM V1 API** which requires a Service Account JSON (not a Server Key).

**Option A: Using Supabase CLI (Recommended)**

```bash
# Set the Service Account JSON as a secret
# The JSON must be minified (single line) and wrapped in single quotes
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"meenma3ana-c6520",...}'

# Optionally set Firebase Project ID (defaults to meenma3ana-c6520)
supabase secrets set FIREBASE_PROJECT_ID=meenma3ana-c6520
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Settings** (or **Secrets**)
3. Add a new secret:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** Paste the entire Service Account JSON content (minified, single line)
4. Click **Save**

**Important Notes:**
- The Service Account JSON must be **minified** (no line breaks)
- Wrap the entire JSON in **single quotes** when using CLI
- Get the Service Account JSON from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

**For detailed setup instructions, see:** `scripts/setup-v1-api-secrets.md`

The Edge Function automatically has access to:
- `SUPABASE_URL` (automatically provided)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically provided)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (must be set manually)
- `FIREBASE_PROJECT_ID` (optional, defaults to `meenma3ana-c6520`)

### Edge Function Location

The Edge Function is located at:
- `supabase/functions/push-fcm/index.ts`
- Uses **FCM V1 API** endpoint: `https://fcm.googleapis.com/v1/projects/{project-id}/messages:send`

## Client-Side Setup

### Step 1: Install Firebase SDK

```bash
npm install firebase
```

### Step 2: Firebase Initialization

Firebase is already initialized in `src/lib/firebase.ts`. The initialization:
- Uses config from `NEXT_PUBLIC_FIREBASE_CONFIG` if available
- Falls back to hardcoded config if env var is not set
- Handles both server and client-side initialization

### Step 3: Service Worker

The service worker is located at `public/firebase-messaging-sw.js` and handles:
- Receiving background push notifications
- Displaying notifications
- Handling notification clicks (opens relevant case page)

**Service Worker Registration:**
- The service worker is automatically registered at `/firebase-messaging-sw.js` when users subscribe to notifications
- Registration is handled by the `useFCMNotifications` hook
- The service worker must be accessible at the root path `/firebase-messaging-sw.js` (served from `public/firebase-messaging-sw.js`)
- The service worker is at the root to allow it to control the entire site (scope `/`)

### Step 4: Using the Hook

Use the `useFCMNotifications` hook in your components:

```tsx
import { useFCMNotifications } from '@/hooks/useFCMNotifications'

function MyComponent() {
  const { 
    isSupported,      // Whether FCM is supported in this browser
    isSubscribed,     // Whether user is currently subscribed
    isLoading,        // Loading state
    error,            // Error message if any
    subscribe,        // Function to subscribe to notifications
    unsubscribe       // Function to unsubscribe from notifications
  } = useFCMNotifications()
  
  return (
    <button 
      onClick={isSubscribed ? unsubscribe : subscribe} 
      disabled={isLoading || !isSupported}
    >
      {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
    </button>
  )
}
```

### Step 5: Push Notification Button Component

Use the pre-built component:

```tsx
import { PushNotificationButton } from '@/components/notifications/PushNotificationButton'

// In your component
<PushNotificationButton />
```

## Testing

### Step 1: Test FCM Token Registration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/test-push` (or wherever you have the notification button)

3. Click "Enable Notifications"
   - Browser should prompt for permission - click "Allow"
   - Check browser console for success messages
   - Verify the button changes to "Disable Notifications"

4. Verify in Database:
   ```sql
   SELECT * FROM fcm_tokens WHERE active = true;
   ```
   You should see:
   - `user_id`: Your user ID
   - `fcm_token`: Firebase token (long string)
   - `platform`: 'web'
   - `active`: true

### Step 2: Test Case Creation Notification

1. Create a new case via the UI or API
2. **All subscribed users should receive a push notification**
3. Check browser for push notification
4. Notification should show: "New Case Available" with case title
5. Click notification - should navigate to case page

### Step 3: Test Case Update Notification

1. **User A**: Subscribe to push notifications
2. **User A**: Make a contribution to a case
3. **User B**: Subscribe to push notifications (but don't contribute)
4. **Admin**: Update the case

**Expected Behavior:**
- **User A** (contributor): Should receive notification
- **User B** (non-contributor): Should NOT receive notification

### Step 4: Test Case Status Change Notification

1. Subscribe to push notifications
2. Create a case (or contribute to one)
3. Change the case status (e.g., from "draft" to "published")
4. **Creator and contributors should receive notification**

### Step 5: Test with Multiple Users

1. Subscribe multiple users (use different browsers or incognito windows)
2. Create a new case
3. **All subscribed users should receive notification**

### Step 6: Test API Endpoint

Test the FCM subscription endpoint:

```bash
# First, get your FCM token from browser console after subscribing
# Then test the endpoint (requires authentication)
curl -X POST http://localhost:3000/api/push/fcm-subscribe \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "fcmToken": "your-fcm-token-here",
    "deviceId": "device-123",
    "platform": "web"
  }'
```

### Step 7: Test Notification Sending

Test sending a notification via API:

```bash
# Requires authentication
curl -X POST http://localhost:3000/api/push/test \
  -H "Cookie: [your-auth-cookie]"
```

### Step 8: Browser Console Testing

Open browser console and check for:

**Success Messages:**
```
✅ FCM subscription successful
✅ Firebase Messaging initialized
✅ FCM token registered successfully
```

**Error Messages (if any):**
```
❌ Failed to initialize Firebase
❌ Error subscribing to FCM
❌ Firebase Messaging not available
```

### Step 9: Edge Function Logs

Check Edge Function logs:

```bash
supabase functions logs push-fcm
```

Look for:
- Successful notification sends
- Error messages
- Token validation issues

## Troubleshooting

### Notifications Not Received

1. **Check Service Account JSON**: Verify `FIREBASE_SERVICE_ACCOUNT_JSON` secret is set correctly in Supabase
   ```bash
   supabase secrets list
   ```
2. **Check Edge Function**: Verify the function is deployed and has the secret
3. **Check FCM Tokens**: Verify tokens exist in database and are active
   ```sql
   SELECT * FROM fcm_tokens WHERE active = true;
   ```
4. **Check Browser Permissions**: User must grant notification permission
   - Chrome: Settings > Site Settings > Notifications
5. **Check Service Worker**: Verify `/firebase-messaging-sw.js` is accessible
   - Open DevTools > Application > Service Workers
6. **Check HTTPS**: Push notifications require HTTPS (except localhost)
7. **Check FCM API**: Verify "Firebase Cloud Messaging API" is enabled in Google Cloud Console

### Edge Function Errors

1. **Check Logs**: 
   ```bash
   supabase functions logs push-fcm
   ```
2. **Verify Secrets**: 
   ```bash
   supabase secrets list
   ```
   Should show:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (required)
   - `FIREBASE_PROJECT_ID` (optional)
3. **Test Function**: Use Supabase Dashboard to test the function
4. **Common Errors**:
   - **"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON"**: JSON must be minified (single line)
   - **"Failed to get access token"**: Verify Service Account has correct permissions
   - **"Permission denied"**: Enable "Firebase Cloud Messaging API" in Google Cloud Console

### Token Registration Fails

1. **Check Firebase Config**: Verify `NEXT_PUBLIC_FIREBASE_CONFIG` is valid JSON string
2. **Check Firebase SDK**: Ensure Firebase is initialized correctly
3. **Check Service Worker**: Verify service worker is registered
4. **Check Permissions**: User must grant notification permission
5. **Check Console**: Look for specific error messages in browser console

### "Failed to enable push notifications"

1. **Browser permission denied**: Check browser notification settings
2. **Service worker registration failed**: Check service worker file is accessible
3. **Firebase not initialized**: Check Firebase config is correct
4. **Check console**: Look for specific error messages

### "FCM not supported"

1. **Browser doesn't support FCM**: Use a modern browser (Chrome, Firefox, Edge)
2. **Service worker not supported**: Check if service workers are enabled
3. **Not HTTPS**: FCM requires HTTPS (except localhost)

### Database Errors

1. **RLS Policy Issues**: 
   - The API route uses service role key to bypass RLS automatically
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
   - Check RLS policies: See `docs/features/FCM_RLS_TROUBLESHOOTING.md`
   - Run SQL check: `scripts/check-fcm-rls.sql` in Supabase SQL Editor
2. **Missing Service Role Key**: 
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
   - Get it from: Supabase Dashboard > Settings > API > Service Role Key
   - Restart dev server after adding
3. **Table doesn't exist**: 
   - Run the migration: `supabase migration up`
   - Or apply manually: `supabase/migrations/1013_add_fcm_tokens.sql`
4. **"new row violates row-level security policy"**:
   - This means RLS is blocking the insert
   - The API route should use service role key (already implemented)
   - Verify service role key is set and correct
   - See troubleshooting guide: `docs/features/FCM_RLS_TROUBLESHOOTING.md`

## API Reference

### Subscribe to FCM Notifications

**Endpoint**: `POST /api/push/fcm-subscribe`

**Authentication**: Required

**Request Body**:
```json
{
  "fcmToken": "string (required)",
  "deviceId": "string (optional)",
  "platform": "web" | "android" | "ios"
}
```

**Response**:
```json
{
  "success": true
}
```

### Send Test Notification

**Endpoint**: `POST /api/push/test`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Test push notification sent successfully",
  "sentCount": 1
}
```

## Components Reference

### PushNotificationButton

Pre-built component for enabling/disabling notifications:

```tsx
import { PushNotificationButton } from '@/components/notifications/PushNotificationButton'

<PushNotificationButton />
```

### useFCMNotifications Hook

React hook for managing FCM notifications:

```tsx
import { useFCMNotifications } from '@/hooks/useFCMNotifications'

const {
  isSupported,    // boolean - Whether FCM is supported
  isSubscribed,   // boolean - Whether user is subscribed
  isLoading,      // boolean - Loading state
  error,          // string | null - Error message
  subscribe,      // () => Promise<boolean> - Subscribe function
  unsubscribe     // () => Promise<boolean> - Unsubscribe function
} = useFCMNotifications()
```

## Service Reference

### FCMNotificationService

Server-side service for sending notifications:

```typescript
import { fcmNotificationService } from '@/lib/notifications/fcm-notifications'

// Notify all users
await fcmNotificationService.notifyAllUsers({
  title: 'Notification Title',
  body: 'Notification body',
  icon: '/logo.png',
  data: { type: 'test' }
})

// Notify specific users
await fcmNotificationService.notifyUsers(
  ['user-id-1', 'user-id-2'],
  {
    title: 'Notification Title',
    body: 'Notification body',
    icon: '/logo.png',
    data: { type: 'test' }
  }
)

// Case-specific notifications
await fcmNotificationService.notifyCaseCreated(caseId, caseTitle, caseTitleAr)
await fcmNotificationService.notifyCaseCompleted(caseId, caseTitle, caseTitleAr)
await fcmNotificationService.notifyCaseUpdated(caseId, caseTitle, caseTitleAr, updateTitle, contributorUserIds)
await fcmNotificationService.notifyCaseStatusChanged(caseId, caseTitle, caseTitleAr, oldStatus, newStatus, creatorId, contributorUserIds)
```

## Production Checklist

Before deploying to production:

- [ ] Firebase Service Account JSON is set as secret in Supabase Edge Functions
- [ ] Firebase Cloud Messaging API is enabled in Google Cloud Console
- [ ] Firebase config (`NEXT_PUBLIC_FIREBASE_CONFIG`) is set in production environment
- [ ] Database migration applied to production
- [ ] Edge Function deployed to production
- [ ] Edge Function secrets verified:
  - [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` is set
  - [ ] `FIREBASE_PROJECT_ID` is set (if different from default)
- [ ] HTTPS is enabled (required for push notifications)
- [ ] Service worker is accessible at `/firebase-messaging-sw.js`
- [ ] Test with multiple browsers (Chrome, Firefox, Edge)
- [ ] Test on mobile devices
- [ ] Verify notifications work after page refresh
- [ ] Test unsubscribe functionality
- [ ] Monitor error logs for token issues
- [ ] Set up error alerting for failed notifications
- [ ] Verify Edge Function logs show successful OAuth2 token generation

## Migration Notes

### FCM V1 API Benefits

The implementation uses **FCM V1 API** (not Legacy API) which provides:
- ✅ **Not deprecated** - Future-proof solution
- ✅ **More secure** - Uses OAuth2 with Service Account
- ✅ **Better error handling** - More detailed error messages
- ✅ **Platform-specific options** - Better control over Android/iOS/Web notifications
- ✅ **Recommended by Google** - Official recommended approach

### Deprecated/Removed

The following are no longer used:

- ~~`src/lib/notifications/push-notifications.ts`~~ - REMOVED (old web-push service)
- ~~`src/hooks/usePushNotifications.ts`~~ - REMOVED (old web-push hook)
- ~~`src/app/api/push/subscribe/route.ts`~~ - Replaced by `fcm-subscribe`
- ~~`src/app/api/push/public-key/route.ts`~~ - No longer needed (no VAPID)
- ~~`public/sw.js`~~ - Replaced by `public/firebase-messaging-sw.js`
- ~~`FIREBASE_SERVER_KEY`~~ - Replaced by `FIREBASE_SERVICE_ACCOUNT_JSON` (V1 API)

### Old Environment Variables (Removed)

- ~~`VAPID_PUBLIC_KEY`~~ - No longer needed
- ~~`VAPID_PRIVATE_KEY`~~ - No longer needed
- ~~`VAPID_SUBJECT`~~ - No longer needed
- ~~`FIREBASE_SERVER_KEY`~~ - Replaced by Service Account JSON (V1 API)

### V1 API Migration

The V1 API:
- Uses OAuth2 tokens instead of Server Key
- Requires Service Account JSON instead of Server Key
- Has a different endpoint: `https://fcm.googleapis.com/v1/projects/{project-id}/messages:send`
- Sends messages one at a time (not in batches like Legacy API)

For detailed migration instructions, see: `scripts/setup-v1-api-secrets.md`

## RLS Troubleshooting

If you're experiencing database errors related to Row Level Security (RLS):

- **Quick Guide**: See `docs/features/FCM_RLS_TROUBLESHOOTING.md`
- **Check Script**: Run `scripts/check-fcm-rls.sql` in Supabase SQL Editor
- **Fix Migration**: Apply `supabase/migrations/1014_fix_fcm_tokens_rls.sql` if needed

**Quick Fix**: The API route automatically uses service role key to bypass RLS. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env` file.

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Firebase Cloud Messaging V1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [FCM V1 API Reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [FCM Web Setup](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Setup V1 API Secrets Guide](scripts/setup-v1-api-secrets.md)

