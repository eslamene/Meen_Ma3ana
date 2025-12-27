-- Fix RLS policy recursion issue on admin_user_roles
-- The admin policy was causing recursive checks when joining to admin_roles
-- We'll use a SECURITY DEFINER function to check admin status instead

-- First, create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_user_roles ur
        JOIN admin_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND r.is_active = true
        AND r.name IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all user roles" ON admin_user_roles;

-- Recreate the admin policy using the helper function
CREATE POLICY "Admins can view all user roles" ON admin_user_roles
    FOR SELECT USING (is_current_user_admin());

-- Also ensure the user can view their own roles policy is correct
DROP POLICY IF EXISTS "Users can view their own roles" ON admin_user_roles;
CREATE POLICY "Users can view their own roles" ON admin_user_roles
    FOR SELECT USING (auth.uid() = user_id);

