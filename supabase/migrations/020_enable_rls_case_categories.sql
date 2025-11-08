-- Enable RLS on case_categories table
-- This migration enables Row Level Security and creates policies for the case_categories table
-- Case categories are reference data that should be readable by everyone but only modifiable by admins

-- Enable RLS
ALTER TABLE case_categories ENABLE ROW LEVEL SECURITY;

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

