-- Combined RLS Migration for contribution_approval_status and case_categories
-- Run this migration to enable RLS on both tables
-- This migration is idempotent - safe to run multiple times

-- ============================================
-- PART 1: Enable RLS on contribution_approval_status
-- ============================================

-- Enable RLS (idempotent - safe if already enabled)
ALTER TABLE contribution_approval_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view own contribution approval status" ON contribution_approval_status;
DROP POLICY IF EXISTS "Admins can view all contribution approval statuses" ON contribution_approval_status;
DROP POLICY IF EXISTS "Admins can insert contribution approval statuses" ON contribution_approval_status;
DROP POLICY IF EXISTS "Admins can update contribution approval statuses" ON contribution_approval_status;
DROP POLICY IF EXISTS "Users can update donor reply for own contributions" ON contribution_approval_status;
DROP POLICY IF EXISTS "Admins can delete contribution approval statuses" ON contribution_approval_status;

-- Policy: Users can view approval status for their own contributions
CREATE POLICY "Users can view own contribution approval status"
ON contribution_approval_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contributions c
    WHERE c.id = contribution_approval_status.contribution_id
    AND c.donor_id = auth.uid()
  )
);

-- Policy: Admins can view all contribution approval statuses
CREATE POLICY "Admins can view all contribution approval statuses"
ON contribution_approval_status
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

-- Policy: Admins can insert approval statuses
CREATE POLICY "Admins can insert contribution approval statuses"
ON contribution_approval_status
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

-- Policy: Admins can update approval statuses
CREATE POLICY "Admins can update contribution approval statuses"
ON contribution_approval_status
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy: Users can update donor_reply and donor_reply_date for their own contributions
CREATE POLICY "Users can update donor reply for own contributions"
ON contribution_approval_status
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contributions c
    WHERE c.id = contribution_approval_status.contribution_id
    AND c.donor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contributions c
    WHERE c.id = contribution_approval_status.contribution_id
    AND c.donor_id = auth.uid()
  )
);

-- Policy: Admins can delete approval statuses
CREATE POLICY "Admins can delete contribution approval statuses"
ON contribution_approval_status
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

-- ============================================
-- PART 2: Enable RLS on case_categories
-- ============================================

-- Enable RLS (idempotent - safe if already enabled)
ALTER TABLE case_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Anyone can view active case categories" ON case_categories;
DROP POLICY IF EXISTS "Admins can view all case categories" ON case_categories;
DROP POLICY IF EXISTS "Admins can insert case categories" ON case_categories;
DROP POLICY IF EXISTS "Admins can update case categories" ON case_categories;
DROP POLICY IF EXISTS "Admins can delete case categories" ON case_categories;

-- Policy: Everyone can view active case categories (for public display in dropdowns, etc.)
CREATE POLICY "Anyone can view active case categories"
ON case_categories
FOR SELECT
USING (is_active = true);

-- Policy: Admins can view all case categories (including inactive ones)
CREATE POLICY "Admins can view all case categories"
ON case_categories
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

-- Policy: Admins can insert case categories
CREATE POLICY "Admins can insert case categories"
ON case_categories
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

-- Policy: Admins can update case categories
CREATE POLICY "Admins can update case categories"
ON case_categories
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

-- Policy: Admins can delete case categories
CREATE POLICY "Admins can delete case categories"
ON case_categories
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

