-- =====================================================
-- Move all RBAC-related menu items from /admin/* to /rbac/*
-- Updates all menu item hrefs to point to new RBAC directory structure
-- This migration handles:
-- - /admin/system-management/* → /rbac/*
-- - /admin/access-control/* → /rbac/*
-- - /admin/users → /rbac/users
-- - /admin/roles → /rbac/roles
-- - /admin/permissions → /rbac/permissions
-- - /admin/menu → /rbac/menu
-- =====================================================

DO $$
DECLARE
    system_mgmt_parent_id UUID;
    access_control_parent_id UUID;
    admin_parent_id UUID;
    rbac_parent_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get admin parent menu ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' AND parent_id IS NULL 
    LIMIT 1;

    -- Step 1: Find or create RBAC parent menu item
    SELECT id INTO rbac_parent_id 
    FROM admin_menu_items 
    WHERE href = '/rbac' AND parent_id = admin_parent_id 
    LIMIT 1;

    IF rbac_parent_id IS NULL AND admin_parent_id IS NOT NULL THEN
        -- Create RBAC parent menu item
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
        
        RAISE NOTICE 'Created RBAC parent menu item with ID: %', rbac_parent_id;
    END IF;

    -- Step 2: Update System Management parent and children
    -- Find parent by either old or new href
    SELECT id INTO system_mgmt_parent_id 
    FROM admin_menu_items 
    WHERE (href = '/admin/system-management' OR href = '/rbac')
    AND parent_id = admin_parent_id 
    LIMIT 1;

    -- If not found, try to find by checking if it has children with old paths
    IF system_mgmt_parent_id IS NULL THEN
        SELECT DISTINCT parent_id INTO system_mgmt_parent_id
        FROM admin_menu_items 
        WHERE href LIKE '/admin/system-management/%'
        AND parent_id IS NOT NULL
        LIMIT 1;
    END IF;

    IF system_mgmt_parent_id IS NOT NULL THEN
        -- Update parent menu href if it's still pointing to old path
        UPDATE admin_menu_items
        SET 
            href = '/rbac',
            label = 'RBAC Management',
            label_ar = 'إدارة RBAC',
            description = 'Manage users, roles, permissions, and access control',
            description_ar = 'إدارة المستخدمين والأدوار والصلاحيات والتحكم في الوصول',
            updated_at = NOW()
        WHERE id = system_mgmt_parent_id 
        AND href != '/rbac';

        -- Step 2a: Delete old menu items that would create duplicates
        -- Remove items with old paths if a /rbac/* version already exists
        DELETE FROM admin_menu_items a
        USING admin_menu_items b
        WHERE a.href IN ('/admin/system-management/users', '/admin/access-control/users', '/admin/users')
        AND b.href = '/rbac/users'
        AND b.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        AND (a.parent_id = system_mgmt_parent_id OR a.parent_id = access_control_parent_id OR a.parent_id = admin_parent_id);

        DELETE FROM admin_menu_items a
        USING admin_menu_items b
        WHERE a.href IN ('/admin/system-management/roles', '/admin/access-control/roles', '/admin/roles')
        AND b.href = '/rbac/roles'
        AND b.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        AND (a.parent_id = system_mgmt_parent_id OR a.parent_id = access_control_parent_id OR a.parent_id = admin_parent_id);

        DELETE FROM admin_menu_items a
        USING admin_menu_items b
        WHERE a.href IN ('/admin/system-management/permissions', '/admin/access-control/permissions', '/admin/permissions')
        AND b.href = '/rbac/permissions'
        AND b.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        AND (a.parent_id = system_mgmt_parent_id OR a.parent_id = access_control_parent_id OR a.parent_id = admin_parent_id);

        DELETE FROM admin_menu_items a
        USING admin_menu_items b
        WHERE a.href = '/admin/system-management/menu-access'
        AND b.href = '/rbac/menu-access'
        AND b.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        AND (a.parent_id = system_mgmt_parent_id OR a.parent_id = access_control_parent_id);

        DELETE FROM admin_menu_items a
        USING admin_menu_items b
        WHERE a.href IN ('/admin/system-management/menu', '/admin/menu')
        AND b.href = '/rbac/menu'
        AND b.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        AND (a.parent_id = system_mgmt_parent_id OR a.parent_id = access_control_parent_id OR a.parent_id = admin_parent_id);

        -- Step 2b: Now update remaining items (only those that won't create duplicates)
        UPDATE admin_menu_items
        SET 
            href = CASE 
                WHEN href IN ('/admin/system-management/users', '/admin/access-control/users', '/admin/users') THEN '/rbac/users'
                WHEN href IN ('/admin/system-management/roles', '/admin/access-control/roles', '/admin/roles') THEN '/rbac/roles'
                WHEN href IN ('/admin/system-management/permissions', '/admin/access-control/permissions', '/admin/permissions') THEN '/rbac/permissions'
                WHEN href = '/admin/system-management/menu-access' THEN '/rbac/menu-access'
                WHEN href IN ('/admin/system-management/menu', '/admin/menu') THEN '/rbac/menu'
                ELSE href
            END,
            parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id),
            updated_at = NOW()
        WHERE (parent_id = system_mgmt_parent_id OR parent_id = access_control_parent_id OR (parent_id = admin_parent_id AND href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu')))
        AND href LIKE '/admin/%'
        AND href NOT LIKE '/rbac/%'
        -- Only update if the target href doesn't already exist for this parent
        AND NOT EXISTS (
            SELECT 1 FROM admin_menu_items existing
            WHERE existing.href = CASE 
                WHEN admin_menu_items.href IN ('/admin/system-management/users', '/admin/access-control/users', '/admin/users') THEN '/rbac/users'
                WHEN admin_menu_items.href IN ('/admin/system-management/roles', '/admin/access-control/roles', '/admin/roles') THEN '/rbac/roles'
                WHEN admin_menu_items.href IN ('/admin/system-management/permissions', '/admin/access-control/permissions', '/admin/permissions') THEN '/rbac/permissions'
                WHEN admin_menu_items.href = '/admin/system-management/menu-access' THEN '/rbac/menu-access'
                WHEN admin_menu_items.href IN ('/admin/system-management/menu', '/admin/menu') THEN '/rbac/menu'
            END
            AND existing.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
        );

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % System Management menu items', updated_count;
    END IF;

    -- Step 3: Update Access Control parent and children
    SELECT id INTO access_control_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin/access-control/users' 
    AND parent_id = admin_parent_id 
    LIMIT 1;

    IF access_control_parent_id IS NULL THEN
        -- Try to find by checking children
        SELECT DISTINCT parent_id INTO access_control_parent_id
        FROM admin_menu_items 
        WHERE href LIKE '/admin/access-control/%'
        AND parent_id IS NOT NULL
        LIMIT 1;
    END IF;

    IF access_control_parent_id IS NOT NULL THEN
        -- Move access-control children to rbac parent
        UPDATE admin_menu_items
        SET 
            href = CASE 
                WHEN href = '/admin/access-control/users' THEN '/rbac/users'
                WHEN href = '/admin/access-control/roles' THEN '/rbac/roles'
                WHEN href = '/admin/access-control/permissions' THEN '/rbac/permissions'
                WHEN href = '/admin/access-control/modules' THEN '/rbac/modules'
                ELSE href
            END,
            parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id),
            updated_at = NOW()
        WHERE parent_id = access_control_parent_id
        AND href LIKE '/admin/access-control/%'
        AND href NOT LIKE '/rbac/%';

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % Access Control menu items', updated_count;

        -- Delete old access-control parent if it exists separately
        DELETE FROM admin_menu_items
        WHERE id = access_control_parent_id
        AND href LIKE '/admin/access-control/%'
        AND parent_id = admin_parent_id;
    END IF;

    -- Step 4: Delete duplicates first, then update remaining items
    -- Delete old menu items if /rbac/* version already exists
    DELETE FROM admin_menu_items old
    WHERE (old.href LIKE '/admin/system-management/%' 
       OR old.href LIKE '/admin/access-control/%'
       OR old.href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu'))
    AND EXISTS (
        SELECT 1 FROM admin_menu_items new
        WHERE new.href = CASE 
            WHEN old.href LIKE '%/users%' OR old.href = '/admin/users' THEN '/rbac/users'
            WHEN old.href LIKE '%/roles%' OR old.href = '/admin/roles' THEN '/rbac/roles'
            WHEN old.href LIKE '%/permissions%' OR old.href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN old.href LIKE '%/menu-access%' THEN '/rbac/menu-access'
            WHEN old.href LIKE '%/menu%' OR old.href = '/admin/menu' THEN '/rbac/menu'
        END
        AND new.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
    );

    -- Step 4b: Now update remaining items (only those that won't create duplicates)
    UPDATE admin_menu_items
    SET 
        href = CASE 
            WHEN href LIKE '%/admin/system-management/users%' OR href = '/admin/access-control/users' OR href = '/admin/users' THEN '/rbac/users'
            WHEN href LIKE '%/admin/system-management/roles%' OR href = '/admin/access-control/roles' OR href = '/admin/roles' THEN '/rbac/roles'
            WHEN href LIKE '%/admin/system-management/permissions%' OR href = '/admin/access-control/permissions' OR href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN href LIKE '%/admin/system-management/menu-access%' THEN '/rbac/menu-access'
            WHEN href LIKE '%/admin/system-management/menu%' OR href = '/admin/menu' THEN '/rbac/menu'
            ELSE href
        END,
        parent_id = CASE 
            WHEN href LIKE '%/admin/system-management/%' OR href LIKE '%/admin/access-control/%' OR href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu')
            THEN COALESCE(rbac_parent_id, system_mgmt_parent_id)
            ELSE parent_id
        END,
        updated_at = NOW()
    WHERE (href LIKE '/admin/system-management/%' 
       OR href LIKE '/admin/access-control/%'
       OR href IN ('/admin/users', '/admin/roles', '/admin/permissions', '/admin/menu'))
    AND href NOT LIKE '/rbac/%'
    -- Only update if target doesn't already exist
    AND NOT EXISTS (
        SELECT 1 FROM admin_menu_items existing
        WHERE existing.href = CASE 
            WHEN admin_menu_items.href LIKE '%/users%' OR admin_menu_items.href = '/admin/users' THEN '/rbac/users'
            WHEN admin_menu_items.href LIKE '%/roles%' OR admin_menu_items.href = '/admin/roles' THEN '/rbac/roles'
            WHEN admin_menu_items.href LIKE '%/permissions%' OR admin_menu_items.href = '/admin/permissions' THEN '/rbac/permissions'
            WHEN admin_menu_items.href LIKE '%/menu-access%' THEN '/rbac/menu-access'
            WHEN admin_menu_items.href LIKE '%/menu%' OR admin_menu_items.href = '/admin/menu' THEN '/rbac/menu'
        END
        AND existing.parent_id = COALESCE(rbac_parent_id, system_mgmt_parent_id)
    );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % standalone admin menu items', updated_count;

    -- Step 5: Remove duplicate menu items (keep only /rbac/* versions)
    DELETE FROM admin_menu_items a
    USING admin_menu_items b
    WHERE a.id > b.id
    AND a.href = b.href
    AND a.href LIKE '/rbac/%'
    AND (a.parent_id = b.parent_id OR (a.parent_id IS NULL AND b.parent_id IS NULL));

    RAISE NOTICE 'Successfully migrated all RBAC menu items from /admin/* to /rbac/*';
END $$;

