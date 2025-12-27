-- Migration: Add Storage Settings menu item
-- This migration adds a Storage menu item under Admin > Settings

-- ============================================
-- STEP 1: Create Settings parent menu item (if it doesn't exist)
-- ============================================

DO $$
DECLARE
    admin_parent_id UUID;
    settings_parent_id UUID;
    manage_files_permission_id UUID;
    max_sort_order INTEGER;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' 
      AND parent_id IS NULL 
    LIMIT 1;
    
    IF admin_parent_id IS NULL THEN
        RAISE WARNING 'Admin parent menu item not found. Cannot create Settings menu.';
        RETURN;
    END IF;
    
    -- Get max sort_order for admin children to place Settings at the end
    SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
    FROM admin_menu_items
    WHERE parent_id = admin_parent_id;
    
    -- Create or get Settings parent menu item
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
        'Settings',
        'الإعدادات',
        '/admin/settings',
        'Settings',
        'System settings and configuration',
        'إعدادات النظام والتكوين',
        max_sort_order + 1,
        (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard' LIMIT 1),
        true
    )
    ON CONFLICT (href, parent_id) 
    DO UPDATE SET
        label = EXCLUDED.label,
        label_ar = EXCLUDED.label_ar,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        sort_order = EXCLUDED.sort_order,
        permission_id = EXCLUDED.permission_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO settings_parent_id;
    
    -- ============================================
    -- STEP 2: Add Storage menu item under Settings
    -- ============================================
    
    -- Get manage:files permission ID
    SELECT id INTO manage_files_permission_id 
    FROM admin_permissions 
    WHERE name = 'manage:files' 
    LIMIT 1;
    
    IF manage_files_permission_id IS NULL THEN
        RAISE WARNING 'manage:files permission not found. Storage menu item will be created without permission.';
    END IF;
    
    -- Get max sort_order for settings children
    SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
    FROM admin_menu_items
    WHERE parent_id = settings_parent_id;
    
    -- Create Storage menu item
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
        settings_parent_id,
        'Storage',
        'التخزين',
        '/admin/settings/storage',
        'Database',
        'Manage storage buckets and upload rules',
        'إدارة دلاء التخزين وقواعد الرفع',
        max_sort_order + 1,
        manage_files_permission_id,
        true
    )
    ON CONFLICT (href, parent_id) 
    DO UPDATE SET
        label = EXCLUDED.label,
        label_ar = EXCLUDED.label_ar,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        sort_order = EXCLUDED.sort_order,
        permission_id = EXCLUDED.permission_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully added/updated Settings and Storage menu items';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    settings_menu_count INTEGER;
    storage_menu_count INTEGER;
BEGIN
    -- Count Settings parent menu item
    SELECT COUNT(*) INTO settings_menu_count
    FROM admin_menu_items
    WHERE href = '/admin/settings' 
      AND parent_id = (SELECT id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1);
    
    -- Count Storage menu item
    SELECT COUNT(*) INTO storage_menu_count
    FROM admin_menu_items
    WHERE href = '/admin/settings/storage' 
      AND parent_id = (SELECT id FROM admin_menu_items WHERE href = '/admin/settings' LIMIT 1)
      AND permission_id = (SELECT id FROM admin_permissions WHERE name = 'manage:files' LIMIT 1);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Menu Items Verification:';
    RAISE NOTICE '  Settings parent menu item: %', 
      CASE WHEN settings_menu_count > 0 THEN '✅ Found' ELSE '❌ Missing' END;
    RAISE NOTICE '  Storage menu item: %', 
      CASE WHEN storage_menu_count > 0 THEN '✅ Found' ELSE '❌ Missing' END;
    RAISE NOTICE '========================================';
END $$;

