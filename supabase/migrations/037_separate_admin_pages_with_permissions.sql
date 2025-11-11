-- =====================================================
-- Create separate permissions and menu items for admin functions
-- This allows assigning permissions individually to specific roles
-- =====================================================

-- Ensure unique constraint exists on admin_menu_items
DO $$
BEGIN
    -- Check if constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_menu_items_href_parent_id_key'
        AND conrelid = 'admin_menu_items'::regclass
    ) THEN
        -- Try to add unique constraint
        ALTER TABLE admin_menu_items 
        ADD CONSTRAINT admin_menu_items_href_parent_id_key 
        UNIQUE (href, parent_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
    WHEN OTHERS THEN
        -- If constraint exists with different name, try to find it
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'admin_menu_items'::regclass
            AND contype = 'u'
            AND array_length(ARRAY(
                SELECT attname FROM pg_attribute 
                WHERE attrelid = conrelid 
                AND attnum = ANY(conkey)
                ORDER BY array_position(conkey, attnum)
            ), 1) = 2
            AND ARRAY(
                SELECT attname FROM pg_attribute 
                WHERE attrelid = conrelid 
                AND attnum = ANY(conkey)
                ORDER BY array_position(conkey, attnum)
            ) = ARRAY['href', 'parent_id']
        ) THEN
            -- Add constraint if it doesn't exist
            ALTER TABLE admin_menu_items 
            ADD CONSTRAINT admin_menu_items_href_parent_id_key 
            UNIQUE (href, parent_id);
        END IF;
END $$;

-- Create individual permissions for each admin function
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES 
  ('admin:users', 'Manage Users', 'إدارة المستخدمين', 'Manage user accounts, profiles, passwords, and merge accounts', 'admin', 'users', true, true),
  ('admin:roles', 'Manage Roles', 'إدارة الأدوار', 'Create and manage roles, assign permissions to roles', 'admin', 'roles', true, true),
  ('admin:permissions', 'Manage Permissions', 'إدارة الصلاحيات', 'Create and manage permissions', 'admin', 'permissions', true, true),
  ('admin:menu', 'Manage Menu', 'إدارة القائمة', 'Manage menu items and their visibility', 'admin', 'menu', true, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- Assign all admin permissions to super_admin role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' 
AND p.name IN ('admin:users', 'admin:roles', 'admin:permissions', 'admin:menu')
ON CONFLICT DO NOTHING;

-- Optionally assign to admin role (uncomment if needed)
-- INSERT INTO admin_role_permissions (role_id, permission_id)
-- SELECT r.id, p.id
-- FROM admin_roles r, admin_permissions p
-- WHERE r.name = 'admin' 
-- AND p.name IN ('admin:users', 'admin:roles', 'admin:permissions', 'admin:menu')
-- ON CONFLICT DO NOTHING;

-- Create/update menu items for each admin function
DO $$
DECLARE
    admin_parent_id UUID;
    access_control_parent_id UUID;
    users_permission_id UUID;
    roles_permission_id UUID;
    permissions_permission_id UUID;
    menu_permission_id UUID;
    existing_item_id UUID;
    manage_rbac_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    -- Get manage:rbac permission ID (for the parent group)
    SELECT id INTO manage_rbac_permission_id FROM admin_permissions WHERE name = 'manage:rbac' LIMIT 1;
    
    -- Get permission IDs
    SELECT id INTO users_permission_id FROM admin_permissions WHERE name = 'admin:users' LIMIT 1;
    SELECT id INTO roles_permission_id FROM admin_permissions WHERE name = 'admin:roles' LIMIT 1;
    SELECT id INTO permissions_permission_id FROM admin_permissions WHERE name = 'admin:permissions' LIMIT 1;
    SELECT id INTO menu_permission_id FROM admin_permissions WHERE name = 'admin:menu' LIMIT 1;
    
    -- Only proceed if admin parent exists
    IF admin_parent_id IS NOT NULL THEN
        -- Create/update "Access Control" parent menu item
        SELECT id INTO access_control_parent_id 
        FROM admin_menu_items 
        WHERE href = '/admin/access-control' AND parent_id = admin_parent_id 
        LIMIT 1;
        
        IF access_control_parent_id IS NOT NULL THEN
            -- Update existing parent
            UPDATE admin_menu_items
            SET
                label = 'Access Control',
                label_ar = 'التحكم في الوصول',
                description = 'Manage users, roles, permissions, and menus',
                description_ar = 'إدارة المستخدمين والأدوار والصلاحيات والقوائم',
                icon = 'Shield',
                permission_id = manage_rbac_permission_id,
                is_active = true,
                sort_order = 7,
                updated_at = NOW()
            WHERE id = access_control_parent_id;
        ELSE
            -- Insert new parent
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                admin_parent_id,
                'Access Control',
                'التحكم في الوصول',
                '/admin/access-control',
                'Shield',
                'Manage users, roles, permissions, and menus',
                'إدارة المستخدمين والأدوار والصلاحيات والقوائم',
                7,
                manage_rbac_permission_id,
                true
            )
            RETURNING id INTO access_control_parent_id;
        END IF;
        
        -- Now create/update child menu items under Access Control
        
        -- User Management menu item
        SELECT id INTO existing_item_id 
        FROM admin_menu_items 
        WHERE href = '/admin/users' AND parent_id = access_control_parent_id 
        LIMIT 1;
        
        IF existing_item_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET
                label = 'User Management',
                label_ar = 'إدارة المستخدمين',
                description = 'Manage user accounts, profiles, passwords, and merge accounts',
                description_ar = 'إدارة حسابات المستخدمين والملفات الشخصية وكلمات المرور ودمج الحسابات',
                icon = 'Users',
                permission_id = users_permission_id,
                is_active = true,
                sort_order = 1,
                updated_at = NOW()
            WHERE id = existing_item_id;
        ELSE
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                access_control_parent_id,
                'User Management',
                'إدارة المستخدمين',
                '/admin/users',
                'Users',
                'Manage user accounts, profiles, passwords, and merge accounts',
                'إدارة حسابات المستخدمين والملفات الشخصية وكلمات المرور ودمج الحسابات',
                1,
                users_permission_id,
                true
            );
        END IF;
        
        -- Role Management menu item
        SELECT id INTO existing_item_id 
        FROM admin_menu_items 
        WHERE href = '/admin/roles' AND parent_id = access_control_parent_id 
        LIMIT 1;
        
        IF existing_item_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET
                label = 'Role Management',
                label_ar = 'إدارة الأدوار',
                description = 'Create and manage roles, assign permissions to roles',
                description_ar = 'إنشاء وإدارة الأدوار وتعيين الصلاحيات للأدوار',
                icon = 'Shield',
                permission_id = roles_permission_id,
                is_active = true,
                sort_order = 2,
                updated_at = NOW()
            WHERE id = existing_item_id;
        ELSE
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                access_control_parent_id,
                'Role Management',
                'إدارة الأدوار',
                '/admin/roles',
                'Shield',
                'Create and manage roles, assign permissions to roles',
                'إنشاء وإدارة الأدوار وتعيين الصلاحيات للأدوار',
                2,
                roles_permission_id,
                true
            );
        END IF;
        
        -- Permission Management menu item
        SELECT id INTO existing_item_id 
        FROM admin_menu_items 
        WHERE href = '/admin/permissions' AND parent_id = access_control_parent_id 
        LIMIT 1;
        
        IF existing_item_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET
                label = 'Permission Management',
                label_ar = 'إدارة الصلاحيات',
                description = 'Create and manage permissions',
                description_ar = 'إنشاء وإدارة الصلاحيات',
                icon = 'Key',
                permission_id = permissions_permission_id,
                is_active = true,
                sort_order = 3,
                updated_at = NOW()
            WHERE id = existing_item_id;
        ELSE
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                access_control_parent_id,
                'Permission Management',
                'إدارة الصلاحيات',
                '/admin/permissions',
                'Key',
                'Create and manage permissions',
                'إنشاء وإدارة الصلاحيات',
                3,
                permissions_permission_id,
                true
            );
        END IF;
        
        -- Menu Management menu item
        SELECT id INTO existing_item_id 
        FROM admin_menu_items 
        WHERE href = '/admin/menu' AND parent_id = access_control_parent_id 
        LIMIT 1;
        
        IF existing_item_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET
                label = 'Menu Management',
                label_ar = 'إدارة القائمة',
                description = 'Manage menu items and their visibility',
                description_ar = 'إدارة عناصر القائمة ومرئيتها',
                icon = 'Menu',
                permission_id = menu_permission_id,
                is_active = true,
                sort_order = 4,
                updated_at = NOW()
            WHERE id = existing_item_id;
        ELSE
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, description_ar, sort_order, permission_id, is_active)
            VALUES (
                access_control_parent_id,
                'Menu Management',
                'إدارة القائمة',
                '/admin/menu',
                'Menu',
                'Manage menu items and their visibility',
                'إدارة عناصر القائمة ومرئيتها',
                4,
                menu_permission_id,
                true
            );
        END IF;
        
        -- Remove old menu items that were direct children of /admin
        -- (if they exist from previous migrations)
        DELETE FROM admin_menu_items 
        WHERE href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu')
        AND parent_id = admin_parent_id;
        
        -- Remove old unified Admin Management menu item if it exists
        DELETE FROM admin_menu_items 
        WHERE href = '/admin/manage' 
        AND parent_id = admin_parent_id;
    END IF;
END $$;

