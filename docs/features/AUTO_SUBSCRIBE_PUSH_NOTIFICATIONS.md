# Auto-Subscribe Push Notifications

This document explains how the automatic push notification subscription system works.

## Overview

The system automatically prompts users to subscribe to push notifications when they log in. Since browsers require explicit user permission for push notifications, we cannot automatically subscribe users, but we can:

1. **Auto-prompt users** on login if they haven't subscribed
2. **Track which users have been prompted** to avoid showing the prompt repeatedly
3. **Show the prompt on key pages** like the dashboard

## Components

### AutoSubscribePrompt

Location: `src/components/notifications/AutoSubscribePrompt.tsx`

A component that automatically shows a prompt asking users to enable push notifications.

**Features:**
- Only shows if FCM is supported in the browser
- Only shows if user hasn't already subscribed
- Shows after a configurable delay (default: 2 seconds)
- Can be configured to show only once per user
- Tracks if user has been prompted using localStorage
- Allows users to subscribe or dismiss

**Usage:**

```tsx
import { AutoSubscribePrompt } from '@/components/notifications/AutoSubscribePrompt'

// In your page component
<AutoSubscribePrompt 
  delay={3000}        // Delay in milliseconds (default: 2000)
  showOnce={true}     // Show only once per user (default: true)
  onSubscribe={() => {}}  // Optional callback when user subscribes
  onDismiss={() => {}}    // Optional callback when user dismisses
/>
```

**Props:**
- `delay?: number` - Delay in milliseconds before showing prompt (default: 2000)
- `showOnce?: boolean` - Whether to show only once per user (default: true)
- `onSubscribe?: () => void` - Callback when user subscribes
- `onDismiss?: () => void` - Callback when user dismisses

## Integration

### Current Integration

The `AutoSubscribePrompt` component is currently integrated into:
- **Dashboard page** (`src/app/[locale]/dashboard/page.tsx`) - Shows when users land on the dashboard

### Adding to More Pages

To add the auto-subscribe prompt to other pages:

```tsx
import { AutoSubscribePrompt } from '@/components/notifications/AutoSubscribePrompt'

export default function YourPage() {
  return (
    <div>
      {/* Your page content */}
      
      {/* Add this at the end */}
      <AutoSubscribePrompt />
    </div>
  )
}
```

### Adding to Layout (Global)

To show the prompt on all pages, add it to the main layout:

```tsx
// src/app/[locale]/layout.tsx
import { AutoSubscribePrompt } from '@/components/notifications/AutoSubscribePrompt'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AutoSubscribePrompt />
      </body>
    </html>
  )
}
```

## Migration Script

### For Existing Users

Run the migration script to see which users need to be prompted:

```bash
# Check which users haven't subscribed
node scripts/admin/78-auto-subscribe-existing-users.js

# Dry run (no changes)
node scripts/admin/78-auto-subscribe-existing-users.js --dry-run
```

**Note:** This script cannot actually subscribe users (browsers require permission). It only shows statistics about which users need to be prompted.

## How It Works

1. **User logs in** → Redirected to dashboard
2. **AutoSubscribePrompt component** checks:
   - Is user authenticated? ✅
   - Is FCM supported? ✅
   - Has user already subscribed? ❌
   - Has user been prompted before? ❌
3. **After delay** (default 2 seconds) → Shows prompt
4. **User clicks "Enable Notifications"** → Browser permission dialog appears
5. **User grants permission** → FCM token is registered
6. **Prompt is dismissed** → Stored in localStorage to prevent showing again

## User Experience

### First Time User
1. User logs in
2. After 2-3 seconds, a card appears in the bottom-right corner
3. Card shows: "Stay Updated! Get instant notifications..."
4. User can click "Enable Notifications" or "Maybe Later"
5. If enabled, browser shows permission dialog
6. If granted, user is subscribed

### Returning User (Not Subscribed)
- If they dismissed the prompt before, it won't show again (unless `showOnce={false}`)
- They can still manually subscribe using the PushNotificationButton component

### Already Subscribed User
- Prompt doesn't show
- They can manage subscription via PushNotificationButton

## Customization

### Change Delay

```tsx
<AutoSubscribePrompt delay={5000} /> // Show after 5 seconds
```

### Show Multiple Times

```tsx
<AutoSubscribePrompt showOnce={false} /> // Show every time user visits
```

### Custom Callbacks

```tsx
<AutoSubscribePrompt 
  onSubscribe={() => {
    // Track subscription event
    analytics.track('push_notification_subscribed')
  }}
  onDismiss={() => {
    // Track dismissal
    analytics.track('push_notification_dismissed')
  }}
/>
```

## Troubleshooting

### Prompt Not Showing

1. **Check FCM support:**
   - Open browser console
   - Check if `useFCMNotifications` hook reports `isSupported: true`

2. **Check if already subscribed:**
   - Check `fcm_tokens` table in database
   - Verify user has active token

3. **Check localStorage:**
   - Open browser DevTools → Application → Local Storage
   - Look for key: `push_prompted_{userId}`
   - If exists, prompt won't show (unless `showOnce={false}`)

4. **Check user authentication:**
   - Ensure user is logged in
   - Check `useAuth()` hook returns user

### Prompt Showing Too Often

- Set `showOnce={true}` (default)
- The component uses localStorage to track if user has been prompted

### Users Not Subscribing

- **Browser permission denied:** User must grant permission in browser settings
- **FCM not supported:** Check browser compatibility
- **Firebase not configured:** Verify Firebase config in `.env`

## Best Practices

1. **Don't be too aggressive:** 
   - Use a reasonable delay (2-3 seconds)
   - Show only once per user by default
   - Allow users to dismiss

2. **Provide value:**
   - Explain why notifications are useful
   - Show what they'll receive notifications for

3. **Respect user choice:**
   - If user dismisses, don't show again (unless they explicitly request it)
   - Provide manual subscription option (PushNotificationButton)

4. **Test thoroughly:**
   - Test on different browsers
   - Test with different permission states
   - Test with users who have/haven't subscribed

## Future Enhancements

Potential improvements:
- [ ] Add analytics tracking for subscription rates
- [ ] A/B test different prompt messages
- [ ] Show prompt based on user behavior (e.g., after first contribution)
- [ ] Add preference to "remind me later" with a specific time
- [ ] Show different messages for different user types (donor vs admin)

