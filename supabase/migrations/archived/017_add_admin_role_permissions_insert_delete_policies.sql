-- =====================================================
-- Add INSERT and DELETE policies for admin_role_permissions
-- This migration allows admins to assign and remove permissions from roles
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert role permissions" ON admin_role_permissions;
DROP POLICY IF EXISTS "Admins can delete role permissions" ON admin_role_permissions;

-- Admins can insert role permission assignments
-- Note: INSERT policies use WITH CHECK, not USING
CREATE POLICY "Admins can insert role permissions" ON admin_role_permissions
    FOR INSERT WITH CHECK (is_current_user_admin());

-- Admins can delete role permission assignments
CREATE POLICY "Admins can delete role permissions" ON admin_role_permissions
    FOR DELETE USING (is_current_user_admin());

