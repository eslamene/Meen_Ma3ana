-- =====================================================
-- FORCE UPDATE: Update ALL menu items from /admin/* to /rbac/*
-- This is a catch-all migration that updates everything regardless of structure
-- Run this if migration 047 didn't catch everything
-- =====================================================

DO $$
DECLARE
    admin_parent_id UUID;
    rbac_parent_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get admin parent menu ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' AND parent_id IS NULL 
    LIMIT 1;

    IF admin_parent_id IS NULL THEN
        RAISE NOTICE 'Admin parent menu not found';
        RETURN;
    END IF;

    -- Find or create RBAC parent
    SELECT id INTO rbac_parent_id 
    FROM admin_menu_items 
    WHERE href = '/rbac' AND parent_id = admin_parent_id 
    LIMIT 1;

    IF rbac_parent_id IS NULL THEN
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
            (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM admin_menu_items WHERE parent_id = admin_parent_id),
            (SELECT id FROM admin_permissions WHERE name = 'admin:users' LIMIT 1),
            true
        )
        RETURNING id INTO rbac_parent_id;
    END IF;

    -- Update parent menu item if it exists with old path
    UPDATE admin_menu_items
    SET 
        href = '/rbac',
        label = 'RBAC Management',
        label_ar = 'إدارة RBAC',
        description = 'Manage users, roles, permissions, and access control',
        description_ar = 'إدارة المستخدمين والأدوار والصلاحيات والتحكم في الوصول',
        updated_at = NOW()
    WHERE (href = '/admin/system-management' OR href LIKE '/admin/system-management')
    AND parent_id = admin_parent_id;

    -- Step 1: Delete old menu items that would create duplicates
    DELETE FROM admin_menu_items old
    WHERE (old.href LIKE '%/admin/system-management%' 
        OR old.href LIKE '%/admin/access-control%'
        OR old.href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu'))
    AND EXISTS (
        SELECT 1 FROM admin_menu_items new
        WHERE new.href = CASE 
            WHEN old.href LIKE '%/users%' OR old.href = '/admin/users' THEN '/rbac/users'
            WHEN old.href LIKE '%/roles%' OR old.href = '/admin/roles' THEN '/rbac/roles'
            WHEN old.href LIKE '%/permissions%' OR old.href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN old.href LIKE '%/menu-access%' THEN '/rbac/menu-access'
            WHEN old.href LIKE '%/menu%' OR old.href = '/admin/menu' THEN '/rbac/menu'
            WHEN old.href = '/admin/system-management' THEN '/rbac'
        END
        AND new.parent_id = rbac_parent_id
    );

    -- Step 2: FORCE UPDATE: Update remaining menu items with old admin paths to /rbac/*
    UPDATE admin_menu_items
    SET 
        href = CASE 
            WHEN href LIKE '%/admin/system-management/users%' OR href LIKE '%/admin/access-control/users%' OR href = '/admin/users' THEN '/rbac/users'
            WHEN href LIKE '%/admin/system-management/roles%' OR href LIKE '%/admin/access-control/roles%' OR href = '/admin/roles' THEN '/rbac/roles'
            WHEN href LIKE '%/admin/system-management/permissions%' OR href LIKE '%/admin/access-control/permissions%' OR href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN href LIKE '%/admin/system-management/menu-access%' THEN '/rbac/menu-access'
            WHEN href LIKE '%/admin/system-management/menu%' OR href = '/admin/menu' THEN '/rbac/menu'
            WHEN href = '/admin/system-management' THEN '/rbac'
            ELSE href
        END,
        parent_id = CASE 
            WHEN href LIKE '%/admin/system-management%' 
                OR href LIKE '%/admin/access-control%' 
                OR href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu')
            THEN rbac_parent_id
            ELSE parent_id
        END,
        updated_at = NOW()
    WHERE (href LIKE '%/admin/system-management%' 
        OR href LIKE '%/admin/access-control%'
        OR href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu'))
    AND href NOT LIKE '/rbac%'
    -- Only update if target doesn't already exist
    AND NOT EXISTS (
        SELECT 1 FROM admin_menu_items existing
        WHERE existing.href = CASE 
            WHEN admin_menu_items.href LIKE '%/users%' OR admin_menu_items.href = '/admin/users' THEN '/rbac/users'
            WHEN admin_menu_items.href LIKE '%/roles%' OR admin_menu_items.href = '/admin/roles' THEN '/rbac/roles'
            WHEN admin_menu_items.href LIKE '%/permissions%' OR admin_menu_items.href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN admin_menu_items.href LIKE '%/menu-access%' THEN '/rbac/menu-access'
            WHEN admin_menu_items.href LIKE '%/menu%' OR admin_menu_items.href = '/admin/menu' THEN '/rbac/menu'
            WHEN admin_menu_items.href = '/admin/system-management' THEN '/rbac'
        END
        AND existing.parent_id = rbac_parent_id
    );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Force updated % menu items to /rbac/*', updated_count;

    -- Remove any duplicates (keep the one with /rbac path)
    DELETE FROM admin_menu_items a
    USING admin_menu_items b
    WHERE a.id > b.id
    AND a.href = b.href
    AND a.href LIKE '/rbac%'
    AND (a.parent_id = b.parent_id OR (a.parent_id IS NULL AND b.parent_id IS NULL));

    RAISE NOTICE 'Successfully force updated all RBAC routes';
END $$;

