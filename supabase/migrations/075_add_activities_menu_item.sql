-- =====================================================
-- Add Activities menu item to admin menu
-- =====================================================

DO $$
DECLARE
    admin_parent_id UUID;
    activities_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' AND parent_id IS NULL 
    LIMIT 1;
    
    -- Get or create permission for viewing activities (super admin only)
    SELECT id INTO activities_permission_id
    FROM admin_permissions
    WHERE name = 'admin:dashboard' -- Use existing admin permission
    LIMIT 1;
    
    IF admin_parent_id IS NOT NULL THEN
        -- Insert Activities menu item
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
            'Activity Logs',
            'سجل الأنشطة',
            '/admin/activities',
            'Activity',
            'View and monitor all site activities',
            'عرض ومراقبة جميع أنشطة الموقع',
            9, -- After Settings, before other items
            activities_permission_id,
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

