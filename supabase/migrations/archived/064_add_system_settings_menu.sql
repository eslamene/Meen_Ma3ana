-- Migration: Add System Settings menu item
-- This migration adds a System Settings menu item under Admin > Settings

-- ============================================
-- STEP 1: Ensure Settings parent menu item exists
-- ============================================

DO $$
DECLARE
    admin_parent_id UUID;
    settings_parent_id UUID;
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
    
    -- Get or create Settings parent menu item
    SELECT id INTO settings_parent_id
    FROM admin_menu_items
    WHERE href = '/admin/settings'
      AND parent_id = admin_parent_id
    LIMIT 1;
    
    IF settings_parent_id IS NULL THEN
        -- Get max sort_order for admin children
        SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order
        FROM admin_menu_items
        WHERE parent_id = admin_parent_id;
        
        -- Create Settings parent menu item
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
    END IF;
    
    -- ============================================
    -- STEP 2: Update Settings parent to point to System Settings page
    -- The Settings parent menu item already exists and points to /admin/settings
    -- We just need to ensure it has the correct description
    -- ============================================
    
    -- Update Settings parent menu item description to reflect System Settings
    UPDATE admin_menu_items
    SET 
        description = 'Manage system configuration and validation rules',
        description_ar = 'إدارة إعدادات النظام وقواعد التحقق',
        updated_at = NOW()
    WHERE href = '/admin/settings'
      AND parent_id = admin_parent_id;
    
    RAISE NOTICE 'Successfully updated Settings menu item to point to System Settings page';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    settings_menu_count INTEGER;
    system_settings_menu_count INTEGER;
BEGIN
    -- Count Settings parent menu item
    SELECT COUNT(*) INTO settings_menu_count
    FROM admin_menu_items
    WHERE href = '/admin/settings' 
      AND parent_id = (SELECT id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Menu Items Verification:';
    RAISE NOTICE '  Settings parent menu item: %', 
      CASE WHEN settings_menu_count > 0 THEN '✅ Found' ELSE '❌ Missing' END;
    RAISE NOTICE '  Settings page available at: /admin/settings';
    RAISE NOTICE '========================================';
END $$;

