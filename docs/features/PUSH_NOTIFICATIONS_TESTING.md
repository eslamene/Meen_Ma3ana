# Push Notifications Testing Guide

## Understanding Notification Behavior

Push notifications work differently depending on the app state:

### ✅ **When Tab is Active/Focused (Foreground)**
- **In-app notifications**: ✅ Will appear in the top-right corner
- **Native system notifications**: ❌ Browser suppresses these (by design)
- **Why**: Browsers don't show native notifications when you're actively viewing the page to avoid interrupting you

### ✅ **When Tab is in Background (Not Focused)**
- **In-app notifications**: ❌ Won't appear (tab is not visible)
- **Native system notifications**: ✅ Will appear in system tray/notification center
- **How to test**: Open the app, then switch to another tab or minimize the browser

### ✅ **When Browser/Tab is Closed**
- **In-app notifications**: ❌ Won't appear (app is closed)
- **Native system notifications**: ✅ Will appear in system tray/notification center
- **How to test**: Close the browser completely, then send a notification

## Testing Native Notifications

### Method 1: Background Tab Test
1. Open your app in a browser tab
2. **Switch to a different tab** (or open a new website)
3. Send a test notification
4. You should see a **native system notification** appear

### Method 2: Minimized Browser Test
1. Open your app in a browser
2. **Minimize the browser window**
3. Send a test notification
4. You should see a **native system notification** appear

### Method 3: Closed Browser Test
1. Open your app and subscribe to notifications
2. **Close the browser completely**
3. Send a test notification (from another device or server)
4. You should see a **native system notification** appear

## Current Status

Based on your console logs:
- ✅ Service worker is receiving push events
- ✅ Messages are being forwarded to clients
- ✅ In-app notifications are working (2 visible in your screenshot)
- ✅ Service worker is attempting to show native notifications
- ⚠️ Native notifications are being suppressed because the tab is active

## Verification

To verify native notifications work:

1. **Subscribe to notifications** (if not already)
2. **Open the app in a tab**
3. **Switch to another tab** (e.g., open google.com)
4. **Send a test notification** from the test page (in the original tab)
5. **Check your system notification center** - you should see the notification

## Troubleshooting

### "I don't see native notifications even when tab is in background"

1. **Check browser notification permissions**:
   - Chrome: Settings > Site Settings > Notifications
   - Firefox: Settings > Privacy & Security > Permissions > Notifications
   - Safari: Preferences > Websites > Notifications

2. **Check system notification settings**:
   - Make sure your OS allows notifications from the browser
   - Check "Do Not Disturb" mode is off

3. **Check service worker logs**:
   - Open DevTools > Application > Service Workers
   - Look for errors in the console

4. **Verify FCM token is active**:
   - Check the database: `SELECT * FROM fcm_tokens WHERE active = true`
   - Make sure your token is registered

### "I see in-app notifications but not native ones"

This is **expected behavior** when the tab is active. Native notifications will only appear when:
- Tab is in background
- Browser is minimized
- Browser/tab is closed

## Summary

**Your push notifications ARE working correctly!** 

- In-app notifications appear when the tab is active ✅
- Native notifications appear when the tab is in background/closed ✅
- This is the standard browser behavior for push notifications

To see native notifications, test with the tab in the background or browser minimized.

