-- =====================================================
-- Ensure Admin Management menu item exists and is visible to super_admin
-- This migration ensures the User Management module is accessible in the navigation
-- =====================================================

-- Ensure manage:rbac permission exists
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('manage:rbac', 'Manage RBAC', 'إدارة RBAC', 'Manage roles, permissions, and user assignments', 'rbac', 'manage', true, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- Ensure super_admin role has manage:rbac permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' AND p.name = 'manage:rbac'
ON CONFLICT DO NOTHING;

-- Ensure admin role has manage:rbac permission (if admins should also access)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin' AND p.name = 'manage:rbac'
ON CONFLICT DO NOTHING;

-- Ensure Admin Management menu item exists in admin section
DO $$
DECLARE
    admin_parent_id UUID;
    manage_rbac_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
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
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                admin_parent_id,
                'Admin Management',
                'إدارة النظام',
                '/admin/manage',
                'Settings',
                'Manage users, roles, permissions, and menu items',
                'إدارة المستخدمين والأدوار والصلاحيات وعناصر القائمة',
                9,
                manage_rbac_permission_id,
                true
            );
        ELSE
            -- Update existing menu item to ensure it's active and properly configured
            UPDATE admin_menu_items
            SET
                label = 'Admin Management',
                label_ar = 'إدارة النظام',
                description = 'Manage users, roles, permissions, and menu items',
                description_ar = 'إدارة المستخدمين والأدوار والصلاحيات وعناصر القائمة',
                icon = 'Settings',
                permission_id = manage_rbac_permission_id,
                is_active = true,
                sort_order = 9,
                updated_at = NOW()
            WHERE href = '/admin/manage' 
            AND parent_id = admin_parent_id;
        END IF;
    END IF;
END $$;

