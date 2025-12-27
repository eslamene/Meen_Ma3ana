-- =====================================================
-- Fix infinite recursion in contributions RLS policies
-- The issue: contributions policy checks contribution_approval_status,
-- which may trigger policies that check contributions again
-- =====================================================

-- ============================================
-- PART 1: Create a security definer function to check approval status
-- This bypasses RLS to avoid circular dependencies
-- ============================================

-- Drop function if exists (idempotent)
DROP FUNCTION IF EXISTS check_contribution_approved(UUID);

-- Create function to check if a contribution is approved
-- SECURITY DEFINER allows it to bypass RLS when checking approval status
CREATE OR REPLACE FUNCTION check_contribution_approved(contribution_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM contribution_approval_status 
    WHERE contribution_id = contribution_id_param 
    AND status = 'approved'
  );
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION check_contribution_approved(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_contribution_approved(UUID) TO anon;

-- ============================================
-- PART 2: Update contributions policies to use the function
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view approved contributions" ON contributions;
DROP POLICY IF EXISTS "Users can view own contributions" ON contributions;
DROP POLICY IF EXISTS "Admins can view all contributions" ON contributions;

-- Policy: Public users can view approved contributions
-- Uses the security definer function to avoid RLS recursion
CREATE POLICY "Public can view approved contributions"
ON contributions
FOR SELECT
USING (
  check_contribution_approved(contributions.id)
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
-- PART 3: Ensure contribution_approval_status policies don't cause recursion
-- ============================================

-- Drop and recreate the public policy to ensure it's simple and doesn't check contributions
DROP POLICY IF EXISTS "Public can view approved contribution status" ON contribution_approval_status;

-- Policy: Public users can view approval status for approved contributions
-- Simple check - no need to check contributions table
CREATE POLICY "Public can view approved contribution status"
ON contribution_approval_status
FOR SELECT
USING (
  status = 'approved'
);

-- ============================================
-- PART 4: Verify the fix
-- ============================================

DO $$
DECLARE
    contributions_policy_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'check_contribution_approved'
    ) INTO function_exists;

    -- Count contributions policies
    SELECT COUNT(*) INTO contributions_policy_count
    FROM pg_policies
    WHERE tablename = 'contributions'
    AND policyname IN ('Public can view approved contributions', 'Users can view own contributions', 'Admins can view all contributions');

    IF function_exists AND contributions_policy_count >= 3 THEN
        RAISE NOTICE 'Successfully fixed contributions RLS recursion. Function created and policies updated.';
    ELSE
        RAISE WARNING 'Fix may not be complete. Function exists: %, Policies count: %', function_exists, contributions_policy_count;
    END IF;
END $$;

