-- Enable Row Level Security (RLS) for dashboard-related tables
-- This migration enables RLS and creates policies for contributions and cases tables
-- to ensure users can only access their own data, while admins can access all data

-- Enable RLS on contributions table
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cases table
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin
-- This function checks if the authenticated user has an admin or super_admin role
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
      AND ur.is_active = true
      AND r.is_active = true
      AND r.name IN ('admin', 'super_admin')
    LIMIT 1
  );
$$;

-- Policies for contributions table
-- Drop existing policies if they exist to avoid conflicts

DROP POLICY IF EXISTS "Users can view own contributions" ON contributions;
DROP POLICY IF EXISTS "Admins can view all contributions" ON contributions;
DROP POLICY IF EXISTS "Users can insert own contributions" ON contributions;
DROP POLICY IF EXISTS "Admins can insert any contributions" ON contributions;
DROP POLICY IF EXISTS "Users can update own contributions" ON contributions;
DROP POLICY IF EXISTS "Admins can update any contributions" ON contributions;

-- Policy: Users can view their own contributions
-- This policy allows users to see contributions where they are the donor
CREATE POLICY "Users can view own contributions"
ON contributions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND donor_id = auth.uid()
);

-- Policy: Admins can view all contributions
-- This policy allows admins to see all contributions regardless of donor_id
CREATE POLICY "Admins can view all contributions"
ON contributions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND is_admin_user(auth.uid()) = true
);

-- Policy: Users can insert their own contributions
CREATE POLICY "Users can insert own contributions"
ON contributions
FOR INSERT
WITH CHECK (
  donor_id = auth.uid()
);

-- Policy: Admins can insert contributions for any user
CREATE POLICY "Admins can insert any contributions"
ON contributions
FOR INSERT
WITH CHECK (
  is_admin_user(auth.uid())
);

-- Policy: Users can update their own contributions (if needed)
CREATE POLICY "Users can update own contributions"
ON contributions
FOR UPDATE
USING (
  donor_id = auth.uid()
)
WITH CHECK (
  donor_id = auth.uid()
);

-- Policy: Admins can update any contributions
CREATE POLICY "Admins can update any contributions"
ON contributions
FOR UPDATE
USING (
  is_admin_user(auth.uid())
)
WITH CHECK (
  is_admin_user(auth.uid())
);

-- Policies for cases table
-- Drop existing policies if they exist to avoid conflicts

DROP POLICY IF EXISTS "Users can view own cases" ON cases;
DROP POLICY IF EXISTS "Admins can view all cases" ON cases;
DROP POLICY IF EXISTS "Public can view published cases" ON cases;
DROP POLICY IF EXISTS "Users can insert own cases" ON cases;
DROP POLICY IF EXISTS "Admins can insert any cases" ON cases;
DROP POLICY IF EXISTS "Users can update own cases" ON cases;
DROP POLICY IF EXISTS "Admins can update any cases" ON cases;

-- Policy: Users can view cases they created
-- This policy allows users to see cases they created
CREATE POLICY "Users can view own cases"
ON cases
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND created_by = auth.uid()
);

-- Policy: Admins can view all cases
-- This policy allows admins to see all cases regardless of created_by
CREATE POLICY "Admins can view all cases"
ON cases
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND is_admin_user(auth.uid()) = true
);

-- Policy: Public users can view published cases (for public browsing)
CREATE POLICY "Public can view published cases"
ON cases
FOR SELECT
USING (
  status = 'published'
);

-- Policy: Users can insert cases they create
CREATE POLICY "Users can insert own cases"
ON cases
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

-- Policy: Admins can insert cases for any user
CREATE POLICY "Admins can insert any cases"
ON cases
FOR INSERT
WITH CHECK (
  is_admin_user(auth.uid())
);

-- Policy: Users can update cases they created
CREATE POLICY "Users can update own cases"
ON cases
FOR UPDATE
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- Policy: Admins can update any cases
CREATE POLICY "Admins can update any cases"
ON cases
FOR UPDATE
USING (
  is_admin_user(auth.uid())
)
WITH CHECK (
  is_admin_user(auth.uid())
);

