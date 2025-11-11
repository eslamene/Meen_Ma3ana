-- =====================================================
-- Flatten Access Control menu structure
-- Remove the "Access Control" parent and make all items direct children of /admin
-- This ensures the menu works with a 2-level structure (parent -> child)
-- =====================================================

DO $$
DECLARE
    admin_parent_id UUID;
    access_control_parent_id UUID;
    users_permission_id UUID;
    roles_permission_id UUID;
    permissions_permission_id UUID;
    menu_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    -- Get Access Control parent ID (to find its children)
    SELECT id INTO access_control_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin/access-control' AND parent_id = admin_parent_id 
    LIMIT 1;
    
    -- Get permission IDs
    SELECT id INTO users_permission_id FROM admin_permissions WHERE name = 'admin:users' LIMIT 1;
    SELECT id INTO roles_permission_id FROM admin_permissions WHERE name = 'admin:roles' LIMIT 1;
    SELECT id INTO permissions_permission_id FROM admin_permissions WHERE name = 'admin:permissions' LIMIT 1;
    SELECT id INTO menu_permission_id FROM admin_permissions WHERE name = 'admin:menu' LIMIT 1;
    
    -- Only proceed if admin parent exists
    IF admin_parent_id IS NOT NULL THEN
        -- If Access Control parent exists, move its children to admin parent
        IF access_control_parent_id IS NOT NULL THEN
            -- Update all children to be direct children of /admin
            UPDATE admin_menu_items
            SET
                parent_id = admin_parent_id,
                updated_at = NOW()
            WHERE parent_id = access_control_parent_id;
            
            -- Delete the Access Control parent item
            DELETE FROM admin_menu_items WHERE id = access_control_parent_id;
        END IF;
        
        -- Ensure all admin management items exist as direct children of /admin
        -- User Management
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
        SELECT 
            admin_parent_id,
            'User Management',
            'إدارة المستخدمين',
            '/admin/users',
            'Users',
            'Manage user accounts, profiles, passwords, and merge accounts',
            'إدارة حسابات المستخدمين والملفات الشخصية وكلمات المرور ودمج الحسابات',
            7,
            users_permission_id,
            true
        WHERE NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/users' AND parent_id = admin_parent_id
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            icon = EXCLUDED.icon,
            permission_id = EXCLUDED.permission_id,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW();
        
        -- Role Management
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
        SELECT 
            admin_parent_id,
            'Role Management',
            'إدارة الأدوار',
            '/admin/roles',
            'Shield',
            'Create and manage roles, assign permissions to roles',
            'إنشاء وإدارة الأدوار وتعيين الصلاحيات للأدوار',
            8,
            roles_permission_id,
            true
        WHERE NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/roles' AND parent_id = admin_parent_id
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            icon = EXCLUDED.icon,
            permission_id = EXCLUDED.permission_id,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW();
        
        -- Permission Management
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
        SELECT 
            admin_parent_id,
            'Permission Management',
            'إدارة الصلاحيات',
            '/admin/permissions',
            'Key',
            'Create and manage permissions',
            'إنشاء وإدارة الصلاحيات',
            9,
            permissions_permission_id,
            true
        WHERE NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/permissions' AND parent_id = admin_parent_id
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            icon = EXCLUDED.icon,
            permission_id = EXCLUDED.permission_id,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW();
        
        -- Menu Management
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
        SELECT 
            admin_parent_id,
            'Menu Management',
            'إدارة القائمة',
            '/admin/menu',
            'Menu',
            'Manage menu items and their visibility',
            'إدارة عناصر القائمة ومرئيتها',
            10,
            menu_permission_id,
            true
        WHERE NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/menu' AND parent_id = admin_parent_id
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            icon = EXCLUDED.icon,
            permission_id = EXCLUDED.permission_id,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW();
    END IF;
END $$;

