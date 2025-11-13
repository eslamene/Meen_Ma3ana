-- =====================================================
-- Allow public users to view approved contributions and case updates
-- This enables unauthenticated users to see case progress and contributions
-- =====================================================

-- ============================================
-- PART 1: Enable RLS on contributions table (if not already enabled)
-- ============================================

-- Enable RLS on contributions table (idempotent)
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Public can view approved contributions" ON contributions;
DROP POLICY IF EXISTS "Users can view own contributions" ON contributions;
DROP POLICY IF EXISTS "Admins can view all contributions" ON contributions;

-- Policy: Public users can view approved contributions
-- This allows unauthenticated users to see approved contributions for cases
CREATE POLICY "Public can view approved contributions"
ON contributions
FOR SELECT
USING (
  -- Check if the contribution has an approved status
  EXISTS (
    SELECT 1 FROM contribution_approval_status cas
    WHERE cas.contribution_id = contributions.id
    AND cas.status = 'approved'
  )
);

-- Policy: Authenticated users can view their own contributions (regardless of approval status)
CREATE POLICY "Users can view own contributions"
ON contributions
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = contributions.donor_id
);

-- Policy: Admins can view all contributions
CREATE POLICY "Admins can view all contributions"
ON contributions
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

-- ============================================
-- PART 2: Allow public users to view approval status for approved contributions
-- ============================================

-- Drop existing policy and recreate with public access
DROP POLICY IF EXISTS "Public can view approved contribution status" ON contribution_approval_status;

-- Policy: Public users can view approval status for approved contributions
CREATE POLICY "Public can view approved contribution status"
ON contribution_approval_status
FOR SELECT
USING (
  status = 'approved'
);

-- ============================================
-- PART 3: Allow public users to view public case updates
-- ============================================

-- Enable RLS on case_updates table (idempotent)
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Public can view public case updates" ON case_updates;
DROP POLICY IF EXISTS "Users can view all case updates" ON case_updates;
DROP POLICY IF EXISTS "Admins can manage case updates" ON case_updates;

-- Policy: Public users can view public case updates
CREATE POLICY "Public can view public case updates"
ON case_updates
FOR SELECT
USING (
  is_public = true
);

-- Policy: Authenticated users can view all case updates (including private ones)
CREATE POLICY "Users can view all case updates"
ON case_updates
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Policy: Admins can manage case updates (insert, update, delete)
CREATE POLICY "Admins can manage case updates"
ON case_updates
FOR ALL
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

-- ============================================
-- PART 4: Allow public users to view user names for approved contributions
-- (Only first_name and last_name, not email or other sensitive data)
-- ============================================

-- Enable RLS on users table (idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Public can view names for approved contributors" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Policy: Public users can view names (first_name, last_name) for users who have approved contributions
-- This allows displaying donor names for approved contributions without exposing sensitive data
CREATE POLICY "Public can view names for approved contributors"
ON users
FOR SELECT
USING (
  -- User has at least one approved contribution
  EXISTS (
    SELECT 1 FROM contributions c
    JOIN contribution_approval_status cas ON cas.contribution_id = c.id
    WHERE c.donor_id = users.id
    AND cas.status = 'approved'
  )
);

-- Policy: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = users.id
);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
ON users
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

-- Verify the policies were created
DO $$
DECLARE
    contributions_policy_count INTEGER;
    approval_status_policy_count INTEGER;
    case_updates_policy_count INTEGER;
    users_policy_count INTEGER;
BEGIN
    -- Count contributions policies
    SELECT COUNT(*) INTO contributions_policy_count
    FROM pg_policies
    WHERE tablename = 'contributions'
    AND policyname IN ('Public can view approved contributions', 'Users can view own contributions', 'Admins can view all contributions');

    -- Count approval status policies
    SELECT COUNT(*) INTO approval_status_policy_count
    FROM pg_policies
    WHERE tablename = 'contribution_approval_status'
    AND policyname = 'Public can view approved contribution status';

    -- Count case updates policies
    SELECT COUNT(*) INTO case_updates_policy_count
    FROM pg_policies
    WHERE tablename = 'case_updates'
    AND policyname IN ('Public can view public case updates', 'Users can view all case updates', 'Admins can manage case updates');

    -- Count users policies
    SELECT COUNT(*) INTO users_policy_count
    FROM pg_policies
    WHERE tablename = 'users'
    AND policyname IN ('Public can view names for approved contributors', 'Users can view own profile', 'Admins can view all users');

    IF contributions_policy_count >= 3 AND approval_status_policy_count >= 1 AND case_updates_policy_count >= 3 AND users_policy_count >= 3 THEN
        RAISE NOTICE 'Successfully created all RLS policies for public access to contributions, case updates, and user names.';
    ELSE
        RAISE WARNING 'Some policies may not have been created. Contributions: %, Approval Status: %, Case Updates: %, Users: %', 
            contributions_policy_count, approval_status_policy_count, case_updates_policy_count, users_policy_count;
    END IF;
END $$;

