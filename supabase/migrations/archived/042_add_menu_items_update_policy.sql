-- =====================================================
-- Add UPDATE policy for admin_menu_items
-- Allows super_admins to update menu items
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can update menu items" ON admin_menu_items;

-- Create UPDATE policy for super_admins
CREATE POLICY "Super admins can update menu items" ON admin_menu_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name = 'super_admin'
            AND r.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name = 'super_admin'
            AND r.is_active = true
        )
    );

-- Also add SELECT policy that allows super_admins to see inactive items
DROP POLICY IF EXISTS "Super admins can view all menu items" ON admin_menu_items;

CREATE POLICY "Super admins can view all menu items" ON admin_menu_items
    FOR SELECT
    USING (
        is_active = true 
        OR EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name = 'super_admin'
            AND r.is_active = true
        )
    );

