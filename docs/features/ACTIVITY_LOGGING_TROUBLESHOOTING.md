# Activity Logging Troubleshooting Guide

## Issue: No logs are being captured

If you're visiting from different devices but not seeing any logs, follow these steps:

## 1. Verify Database Migration

First, ensure the migration has been applied:

```bash
# Check if the table exists
psql $DATABASE_URL -c "\d site_activity_log"

# Or run the migration manually if needed
psql $DATABASE_URL -f supabase/migrations/074_create_site_activity_log.sql
```

## 2. Test the Database Connection

Run the test script:

```bash
node scripts/test-activity-logging.js
```

This will:
- Check if the table exists
- Test inserting a log entry
- Show recent logs
- Verify RLS policies

## 3. Check Browser Console

Open your browser's developer console (F12) and look for:
- Errors related to `/api/activity/track`
- Network requests to `/api/activity/track` (should show 200 status)
- Any JavaScript errors

## 4. Verify Client-Side Tracking

The tracking is integrated in `PageLayout.tsx` using `usePageViewTracking()`. 

To verify it's working:
1. Open browser console
2. Navigate to a page
3. Check Network tab for POST requests to `/api/activity/track`
4. Check if session ID is stored: `localStorage.getItem('activity_session_id')`

## 5. Check Server-Side Logs

The middleware also logs page views. Check your server logs for:
- "Logging activity" debug messages
- "Activity logged successfully" messages
- Any error messages from `ActivityService`

## 6. Verify API Endpoint

Test the API endpoint directly:

```bash
curl -X POST http://localhost:3000/api/activity/track \
  -H "Content-Type: application/json" \
  -d '{
    "activity_type": "page_view",
    "category": "navigation",
    "action": "view_page",
    "resource_type": "page",
    "resource_path": "/test",
    "session_id": "test-session-123"
  }'
```

Should return: `{"success":true}`

## 7. Check Database Directly

Query the database to see if logs are being created:

```sql
SELECT 
  id,
  activity_type,
  action,
  resource_path,
  user_id,
  session_id,
  created_at
FROM site_activity_log
ORDER BY created_at DESC
LIMIT 10;
```

## 8. Common Issues

### Issue: RLS Policy Blocking Inserts

**Solution**: The migration includes a policy `"System can insert activity logs"` with `WITH CHECK (true)` which should allow all inserts. If you're still having issues, check:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'site_activity_log';

-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE site_activity_log DISABLE ROW LEVEL SECURITY;
```

### Issue: Client-Side Tracking Not Firing

**Solution**: 
1. Ensure `usePageViewTracking()` is called in `PageLayout.tsx`
2. Check that the component is client-side (`'use client'`)
3. Verify the hook is not being blocked by ad blockers

### Issue: Session ID Not Persisting

**Solution**: The session ID is stored in `localStorage` and `sessionStorage`. Check:
- Browser allows localStorage
- No privacy/incognito mode blocking storage
- Clear storage and refresh to generate new session

### Issue: Middleware Not Logging

**Solution**: 
1. Check `proxy.ts` has the activity logging code
2. Verify the dynamic import is working
3. Check server logs for errors

## 9. Enable Debug Logging

To see more detailed logs, set in your environment:

```bash
DEBUG=true
LOG_LEVEL=debug
```

This will show:
- When activities are being logged
- When the API endpoint is called
- Any errors in the logging process

## 10. Manual Test

Create a test log manually:

```javascript
// In browser console
fetch('/api/activity/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    activity_type: 'page_view',
    category: 'navigation',
    action: 'view_page',
    resource_type: 'page',
    resource_path: window.location.pathname,
    session_id: localStorage.getItem('activity_session_id')
  })
}).then(r => r.json()).then(console.log)
```

## Still Not Working?

1. Check the database connection string is correct
2. Verify the migration was applied successfully
3. Check server logs for database connection errors
4. Verify the `ActivityService.logActivity` method is being called
5. Check if there are any TypeScript/compilation errors

## Next Steps

Once logging is working:
1. Visit the admin activities page: `/admin/activities`
2. Check the visitor statistics
3. Verify logs are appearing in real-time
4. Test from different devices/browsers

