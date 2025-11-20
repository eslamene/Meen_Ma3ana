# Site Activity Logging and Monitoring System

## Overview

A comprehensive activity logging and monitoring system has been implemented to track all site activities including page views, API calls, user actions, data changes, authentication events, system events, and errors. **The system tracks both authenticated users and anonymous visitors**, providing complete visibility into site usage.

## Components

### 1. Database Schema (`074_create_site_activity_log.sql`)

- **Table**: `site_activity_log`
- **Fields**:
  - `id`: UUID primary key
  - `user_id`: Reference to authenticated user (**NULL for anonymous visitors**)
  - `session_id`: Session identifier for tracking user sessions
  - `activity_type`: Type of activity (page_view, api_call, user_action, data_change, auth_event, system_event, error)
  - `category`: Category for grouping (navigation, authentication, data, admin, system, security)
  - `action`: Specific action performed
  - `resource_type`: Type of resource affected
  - `resource_id`: ID of the resource
  - `resource_path`: URL path or API endpoint
  - `method`: HTTP method for API calls
  - `status_code`: HTTP status code
  - `ip_address`: User's IP address
  - `user_agent`: Browser/user agent string
  - `referer`: Referrer URL
  - `details`: JSONB field for additional context
  - `metadata`: JSONB field for performance metrics and device info
  - `severity`: Severity level (info, warning, error, critical)
  - `created_at`: Timestamp

- **Indexes**: Optimized for common queries (user_id, activity_type, created_at, session_id, etc.)
- **RLS Policies**: 
  - Users can view their own logs
  - Admins can view all logs (including visitor logs)
  - Anonymous users can insert logs (for visitor tracking)
- **Views**:
  - `site_activity_summary`: General activity summary
  - `visitor_activity_summary`: Visitor-specific analytics
  - `visitor_sessions`: Visitor session tracking with journey data
- **Cleanup Function**: `cleanup_old_activity_logs()` for automatic log retention

### 2. Activity Service (`src/lib/services/activityService.ts`)

Core service for logging activities:

- `logPageView()`: Log page views
- `logApiCall()`: Log API calls with status codes
- `logUserAction()`: Log user interactions (clicks, form submissions)
- `logDataChange()`: Log data changes (create, update, delete)
- `logAuthEvent()`: Log authentication events
- `logSystemEvent()`: Log system events
- `logError()`: Log errors with stack traces
- `getActivityLogs()`: Query activity logs with filtering
- `getActivityStats()`: Get activity statistics and analytics
- `getVisitorStats()`: Get visitor-specific statistics (anonymous users)
- `getVisitorSessions()`: Get visitor session data with journey tracking
- `cleanupOldLogs()`: Clean up old logs based on retention policy

### 3. Middleware Integration

- **Page View Logging**: Automatically logs page views (can be added to middleware)
- **API Call Logging**: Wrapper for API routes (`withActivityLogging`)

### 4. Client-Side Hooks (`src/hooks/useActivityTracking.ts`)

React hooks for client-side activity tracking:

- `usePageViewTracking()`: Automatically tracks page views
- `useActivityTracking()`: Hook for tracking user actions
- `useClickTracking()`: Hook for tracking clicks on specific elements
- `useFormTracking()`: Hook for tracking form submissions

### 5. API Endpoints

- **POST `/api/activity/track`**: Track activities from client-side (works for visitors too)
- **GET `/api/activity/logs`**: Query activity logs with filtering (admin only for visitor logs)
- **GET `/api/activity/stats`**: Get activity statistics and analytics
- **GET `/api/activity/visitors`**: Get visitor statistics and session data (admin only)

## Usage Examples

### Logging Page Views

```typescript
import { ActivityService } from '@/lib/services/activityService'

await ActivityService.logPageView({
  user_id: user?.id,
  session_id: sessionId,
  path: '/dashboard',
  ip_address: ipAddress,
  user_agent: userAgent,
})
```

### Logging User Actions

```typescript
import { useActivityTracking } from '@/hooks/useActivityTracking'

const { trackAction } = useActivityTracking()

trackAction('button_click', {
  button_name: 'donate',
  case_id: '123',
}, 'case', '123')
```

### Logging Data Changes

```typescript
import { ActivityService } from '@/lib/services/activityService'

await ActivityService.logDataChange({
  user_id: user.id,
  action: 'update',
  resource_type: 'case',
  resource_id: caseId,
  old_values: oldCase,
  new_values: newCase,
})
```

### Logging Authentication Events

```typescript
import { ActivityService } from '@/lib/services/activityService'

await ActivityService.logAuthEvent({
  user_id: user.id,
  action: 'login',
  success: true,
  ip_address: ipAddress,
  user_agent: userAgent,
})
```

### Querying Activity Logs

```typescript
import { ActivityService } from '@/lib/services/activityService'

const logs = await ActivityService.getActivityLogs({
  user_id: userId,
  activity_type: 'page_view',
  start_date: new Date('2024-01-01'),
  limit: 100,
})
```

### Getting Activity Statistics

```typescript
import { ActivityService } from '@/lib/services/activityService'

const stats = await ActivityService.getActivityStats({
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-31'),
  group_by: 'day',
})
```

## Visitor Tracking

The system automatically tracks **anonymous visitors** (users who are not logged in):

- **Automatic Tracking**: Page views are automatically logged in middleware for all visitors
- **Session Tracking**: Each visitor gets a unique session ID stored in sessionStorage
- **Visitor Analytics**: Special views and endpoints for visitor-specific analytics
- **Journey Tracking**: Track visitor paths through the site

### Visitor Tracking Features

1. **Automatic Page View Logging**: All page views are logged automatically (no code needed)
2. **Session Management**: Visitors get unique session IDs that persist across page views
3. **Visitor Analytics**: 
   - Unique visitor counts
   - Session duration
   - Pages visited
   - Visitor journeys
4. **Privacy**: IP addresses and user agents are logged for analytics (can be anonymized if needed)

## Integration Points

### 1. Automatic Visitor Tracking

Visitor tracking is **already enabled** in the middleware! All page views are automatically logged for both authenticated users and visitors.

### 2. Add Page View Tracking to Layout (Optional - already in middleware)

If you want additional client-side tracking:

```typescript
import { usePageViewTracking } from '@/hooks/useActivityTracking'

export default function Layout({ children }) {
  usePageViewTracking() // Automatically tracks page views (works for visitors too)
  
  return <>{children}</>
}
```

### 2. Wrap API Routes

Wrap API route handlers to automatically log API calls:

```typescript
import { withActivityLogging } from '@/lib/middleware/apiActivityLogger'

export const GET = withActivityLogging(async (request) => {
  // Your API logic
  return NextResponse.json({ data: '...' })
})
```

### 3. Track User Actions in Components

```typescript
import { useClickTracking } from '@/hooks/useActivityTracking'

function DonateButton({ caseId }) {
  const { handleClick } = useClickTracking(
    'donate_button_click',
    'case',
    caseId
  )
  
  return <button onClick={handleClick}>Donate</button>
}
```

## Admin Interface

To create an admin interface for viewing activities:

1. Create a page at `src/app/[locale]/admin/activities/page.tsx`
2. Use the API endpoints to fetch and display logs
3. Add filtering, search, and pagination
4. Display statistics and charts

### Example Queries

**Get all activity logs:**
```typescript
const response = await fetch('/api/activity/logs?limit=50&activity_type=page_view')
const { logs } = await response.json()
```

**Get visitor statistics:**
```typescript
const response = await fetch('/api/activity/visitors?group_by=day&start_date=2024-01-01')
const { stats } = await response.json()
// Returns: unique_visitors, unique_sessions, page_views, unique_pages, avg_session_duration
```

**Get visitor sessions:**
```typescript
const response = await fetch('/api/activity/visitors?type=sessions&limit=100')
const { sessions } = await response.json()
// Returns: session_id, session_start, session_end, page_views, pages_visited, etc.
```

## Performance Considerations

- All logging is **asynchronous** and **non-blocking**
- Logging failures don't break the application
- Database indexes are optimized for common queries
- Automatic cleanup of old logs (configurable retention period)

## Security

- RLS policies ensure users can only view their own logs
- Admins can view all logs
- IP addresses and user agents are logged for security analysis
- Sensitive data should not be included in details/metadata

## Next Steps

1. **Run the migration**: Apply `074_create_site_activity_log.sql`
2. **Visitor tracking is automatic**: Page views are already logged in middleware for all visitors
3. **Wrap API routes**: Use `withActivityLogging` for API routes (optional)
4. **Create admin interface**: Build UI for viewing and monitoring activities and visitors
5. **Set up cleanup job**: Schedule automatic cleanup of old logs
6. **Monitor visitor analytics**: Use `/api/activity/visitors` endpoint for visitor insights

## Monitoring Recommendations

- Monitor error rates and critical events
- Track user engagement metrics
- Analyze API performance
- Detect suspicious activities
- Generate reports for stakeholders

