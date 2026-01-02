-- Enable RLS on cases table
-- This migration enables Row Level Security and creates policies for the cases table
-- Cases should be viewable by the public when published, but only modifiable by admins

-- Enable RLS (if not already enabled)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public can view published cases" ON cases;
DROP POLICY IF EXISTS "Users can view their own cases" ON cases;
DROP POLICY IF EXISTS "Admins can view all cases" ON cases;
DROP POLICY IF EXISTS "Admins can insert cases" ON cases;
DROP POLICY IF EXISTS "Admins can update cases" ON cases;
DROP POLICY IF EXISTS "Admins can delete cases" ON cases;

-- Policy 1: Public can view published cases (for public-facing pages)
CREATE POLICY "Public can view published cases"
ON cases
FOR SELECT
USING (status = 'published');

-- Policy 2: Authenticated users can view cases they created (regardless of status)
CREATE POLICY "Users can view their own cases"
ON cases
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- Policy 3: Admins can view all cases (including drafts, submitted, under_review, etc.)
CREATE POLICY "Admins can view all cases"
ON cases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy 4: Admins can insert cases
CREATE POLICY "Admins can insert cases"
ON cases
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy 5: Admins can update cases
CREATE POLICY "Admins can update cases"
ON cases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy 6: Admins can delete cases
CREATE POLICY "Admins can delete cases"
ON cases
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
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
WHERE tablename = 'cases'
ORDER BY policyname;

