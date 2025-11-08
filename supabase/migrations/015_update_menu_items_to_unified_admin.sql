-- =====================================================
-- Update menu items to point to unified admin management page
-- This migration updates the old access-control menu items to point to /admin/manage
-- =====================================================

-- Update Access Control menu items to point to unified page
UPDATE admin_menu_items
SET 
    href = '/admin/manage',
    label = 'Admin Management',
    label_ar = 'إدارة النظام',
    description = 'Unified admin management interface',
    description_ar = 'واجهة إدارة موحدة',
    updated_at = NOW()
WHERE href IN (
    '/admin/access-control/users',
    '/admin/access-control/roles',
    '/admin/access-control/permissions',
    '/admin/access-control/modules'
);

-- Update old /admin/users menu item to point to unified page
UPDATE admin_menu_items
SET 
    href = '/admin/manage',
    label = 'Admin Management',
    label_ar = 'إدارة النظام',
    description = 'Unified admin management interface',
    description_ar = 'واجهة إدارة موحدة',
    updated_at = NOW()
WHERE href = '/admin/users';

-- Remove duplicate menu items (keep only one entry per href and parent_id combination)
-- This ensures we don't have multiple menu items pointing to the same page
DELETE FROM admin_menu_items a
USING admin_menu_items b
WHERE a.id > b.id
  AND a.href = b.href
  AND a.href = '/admin/manage'
  AND (a.parent_id = b.parent_id OR (a.parent_id IS NULL AND b.parent_id IS NULL));

-- Ensure there's a single "Admin Management" menu item in the admin section
-- If no menu item exists for /admin/manage, create one
DO $$
DECLARE
    admin_parent_id UUID;
    manage_rbac_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' LIMIT 1;
    
    -- Get manage:rbac permission ID
    SELECT id INTO manage_rbac_permission_id FROM admin_permissions WHERE name = 'manage:rbac' LIMIT 1;
    
    -- Only proceed if admin parent exists
    IF admin_parent_id IS NOT NULL THEN
        -- Check if menu item already exists
        IF NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/manage' 
            AND parent_id = admin_parent_id
        ) THEN
            -- Insert the Admin Management menu item
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id)
            VALUES (
                admin_parent_id,
                'Admin Management',
                'إدارة النظام',
                '/admin/manage',
                'Settings',
                'Unified admin management interface for users, roles, permissions, and menus',
                'واجهة إدارة موحدة للمستخدمين والأدوار والصلاحيات والقوائم',
                10,
                manage_rbac_permission_id
            );
        ELSE
            -- Update existing menu item
            UPDATE admin_menu_items
            SET
                label = 'Admin Management',
                label_ar = 'إدارة النظام',
                description = 'Unified admin management interface for users, roles, permissions, and menus',
                description_ar = 'واجهة إدارة موحدة للمستخدمين والأدوار والصلاحيات والقوائم',
                icon = 'Settings',
                permission_id = manage_rbac_permission_id,
                updated_at = NOW()
            WHERE href = '/admin/manage' 
            AND parent_id = admin_parent_id;
        END IF;
    END IF;
END $$;

