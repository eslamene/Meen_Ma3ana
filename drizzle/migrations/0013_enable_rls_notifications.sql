-- Enable Row Level Security (RLS) for notifications table
-- This migration enables RLS and creates policies to ensure users can only access their own notifications

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- Policy 1: Users can view their own notifications
-- This policy allows users to see notifications where they are the recipient
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND recipient_id = auth.uid()
);

-- Policy 2: Users can update their own notifications (mark as read)
-- This policy allows users to update notifications where they are the recipient
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND recipient_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND recipient_id = auth.uid()
);

-- Policy 3: Service role can insert notifications
-- This policy allows the service role (used by API) to insert notifications
-- Note: Service role bypasses RLS, but this policy is here for clarity
-- In practice, notifications are inserted via service role which bypasses RLS
CREATE POLICY "Service can insert notifications"
ON notifications
FOR INSERT
WITH CHECK (true); -- Service role will bypass this anyway, but good to have

-- Policy 4: Admins can view all notifications (optional, for admin dashboard)
-- This policy allows admins to see all notifications for moderation purposes
CREATE POLICY "Admins can view all notifications"
ON notifications
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.is_active = true
      AND r.name IN ('admin', 'super_admin')
    LIMIT 1
  )
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

