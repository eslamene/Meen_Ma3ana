-- =====================================================
-- Add INSERT policy for admin_menu_items
-- Allows super_admins to create menu items
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can insert menu items" ON admin_menu_items;

-- Create INSERT policy for super_admins
CREATE POLICY "Super admins can insert menu items" ON admin_menu_items
    FOR INSERT
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

