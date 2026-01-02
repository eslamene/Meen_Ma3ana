-- Enable Row Level Security (RLS) for AI rules and parameters tables
-- This migration enables RLS and creates policies to ensure only admins can manage AI rules

-- Enable RLS on ai_rules table
ALTER TABLE public.ai_rules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_rule_parameters table
ALTER TABLE public.ai_rule_parameters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Admins can view all ai_rules" ON public.ai_rules;
DROP POLICY IF EXISTS "Admins can insert ai_rules" ON public.ai_rules;
DROP POLICY IF EXISTS "Admins can update ai_rules" ON public.ai_rules;
DROP POLICY IF EXISTS "Admins can delete ai_rules" ON public.ai_rules;

DROP POLICY IF EXISTS "Admins can view all ai_rule_parameters" ON public.ai_rule_parameters;
DROP POLICY IF EXISTS "Admins can insert ai_rule_parameters" ON public.ai_rule_parameters;
DROP POLICY IF EXISTS "Admins can update ai_rule_parameters" ON public.ai_rule_parameters;
DROP POLICY IF EXISTS "Admins can delete ai_rule_parameters" ON public.ai_rule_parameters;

-- Policies for ai_rules table

-- Policy 1: Admins can view all AI rules
CREATE POLICY "Admins can view all ai_rules"
ON public.ai_rules
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

-- Policy 2: Admins can insert AI rules
CREATE POLICY "Admins can insert ai_rules"
ON public.ai_rules
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

-- Policy 3: Admins can update AI rules
CREATE POLICY "Admins can update ai_rules"
ON public.ai_rules
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

-- Policy 4: Admins can delete AI rules
CREATE POLICY "Admins can delete ai_rules"
ON public.ai_rules
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

-- Policies for ai_rule_parameters table

-- Policy 1: Admins can view all AI rule parameters
CREATE POLICY "Admins can view all ai_rule_parameters"
ON public.ai_rule_parameters
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

-- Policy 2: Admins can insert AI rule parameters
CREATE POLICY "Admins can insert ai_rule_parameters"
ON public.ai_rule_parameters
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

-- Policy 3: Admins can update AI rule parameters
CREATE POLICY "Admins can update ai_rule_parameters"
ON public.ai_rule_parameters
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

-- Policy 4: Admins can delete AI rule parameters
CREATE POLICY "Admins can delete ai_rule_parameters"
ON public.ai_rule_parameters
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

