-- =====================================================
-- Add System Management menu structure
-- Creates parent menu "System Management" with children:
-- - Users
-- - Roles
-- - Permissions
-- - Menu Access (renamed from Menus)
-- - Menu
-- =====================================================

DO $$
DECLARE
    system_mgmt_parent_id UUID;
    admin_parent_id UUID;
    max_sort_order INTEGER;
BEGIN
    -- Get the Administration parent menu ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' AND parent_id IS NULL 
    LIMIT 1;

    -- Get max sort_order for admin children to place System Management at the end
    SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
    FROM admin_menu_items
    WHERE parent_id = admin_parent_id;

    -- Create System Management parent menu item
    INSERT INTO admin_menu_items (
        parent_id,
        label,
        label_ar,
        href,
        icon,
        description,
        description_ar,
        sort_order,
        permission_id,
        is_active
    ) VALUES (
        admin_parent_id,
        'RBAC Management',
        'إدارة RBAC',
        '/rbac',
        'Settings',
        'Manage users, roles, permissions, and access control',
        'إدارة المستخدمين والأدوار والصلاحيات والتحكم في الوصول',
        max_sort_order + 1,
        (SELECT id FROM admin_permissions WHERE name = 'admin:users' LIMIT 1),
        true
    )
    ON CONFLICT (href, parent_id) DO UPDATE SET
        label = EXCLUDED.label,
        label_ar = EXCLUDED.label_ar,
        href = '/rbac', -- Ensure href is updated to /rbac
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        sort_order = EXCLUDED.sort_order,
        permission_id = EXCLUDED.permission_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO system_mgmt_parent_id;

    -- If System Management was created/updated, add children
    IF system_mgmt_parent_id IS NOT NULL THEN
        -- Users
        INSERT INTO admin_menu_items (
            parent_id,
            label,
            label_ar,
            href,
            icon,
            description,
            description_ar,
            sort_order,
            permission_id,
            is_active
        ) VALUES (
            system_mgmt_parent_id,
            'Users',
            'المستخدمون',
            '/rbac/users',
            'Users',
            'Manage user profiles, reset passwords, and merge accounts',
            'إدارة ملفات المستخدمين وإعادة تعيين كلمات المرور ودمج الحسابات',
            1,
            (SELECT id FROM admin_permissions WHERE name = 'admin:users' LIMIT 1),
            true
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();

        -- Roles
        INSERT INTO admin_menu_items (
            parent_id,
            label,
            label_ar,
            href,
            icon,
            description,
            description_ar,
            sort_order,
            permission_id,
            is_active
        ) VALUES (
            system_mgmt_parent_id,
            'Roles',
            'الأدوار',
            '/rbac/roles',
            'Shield',
            'Create and manage roles, assign permissions',
            'إنشاء وإدارة الأدوار وتعيين الصلاحيات',
            2,
            (SELECT id FROM admin_permissions WHERE name = 'admin:roles' LIMIT 1),
            true
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();

        -- Permissions
        INSERT INTO admin_menu_items (
            parent_id,
            label,
            label_ar,
            href,
            icon,
            description,
            description_ar,
            sort_order,
            permission_id,
            is_active
        ) VALUES (
            system_mgmt_parent_id,
            'Permissions',
            'الصلاحيات',
            '/rbac/permissions',
            'Key',
            'Create and manage permissions',
            'إنشاء وإدارة الصلاحيات',
            3,
            (SELECT id FROM admin_permissions WHERE name = 'admin:permissions' LIMIT 1),
            true
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();

        -- Menu Access (renamed from Menus)
        INSERT INTO admin_menu_items (
            parent_id,
            label,
            label_ar,
            href,
            icon,
            description,
            description_ar,
            sort_order,
            permission_id,
            is_active
        ) VALUES (
            system_mgmt_parent_id,
            'Menu Access',
            'الوصول إلى القائمة',
            '/rbac/menu-access',
            'Menu',
            'Manage menu items and their visibility by role',
            'إدارة عناصر القائمة ومدى وضوحها حسب الدور',
            4,
            (SELECT id FROM admin_permissions WHERE name = 'admin:menu' LIMIT 1),
            true
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();

        -- Menu (Menu Management)
        INSERT INTO admin_menu_items (
            parent_id,
            label,
            label_ar,
            href,
            icon,
            description,
            description_ar,
            sort_order,
            permission_id,
            is_active
        ) VALUES (
            system_mgmt_parent_id,
            'Menu',
            'القائمة',
            '/rbac/menu',
            'List',
            'Manage menu items, reorder, and configure navigation',
            'إدارة عناصر القائمة وإعادة ترتيبها وتكوين التنقل',
            5,
            (SELECT id FROM admin_permissions WHERE name = 'admin:menu' LIMIT 1),
            true
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    END IF;
END $$;

