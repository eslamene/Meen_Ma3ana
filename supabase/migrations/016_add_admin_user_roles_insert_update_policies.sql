-- =====================================================
-- Add INSERT and UPDATE policies for admin_user_roles
-- This migration allows admins to assign and remove roles from users
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert user roles" ON admin_user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON admin_user_roles;

-- Admins can insert user role assignments
-- Note: INSERT policies use WITH CHECK, not USING
CREATE POLICY "Admins can insert user roles" ON admin_user_roles
    FOR INSERT WITH CHECK (is_current_user_admin());

-- Admins can update user role assignments (for activating/deactivating roles)
-- UPDATE policies can use USING for row selection and WITH CHECK for new values
CREATE POLICY "Admins can update user roles" ON admin_user_roles
    FOR UPDATE USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

