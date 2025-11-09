-- Enable RLS on contribution_approval_status table
-- This migration enables Row Level Security and creates policies for the contribution_approval_status table

-- Enable RLS
ALTER TABLE contribution_approval_status ENABLE ROW LEVEL SECURITY;

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
-- Note: This policy allows users to update the record, but the application should restrict
-- which fields can be updated (only donor_reply and donor_reply_date)
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

