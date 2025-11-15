-- =====================================================
-- Add Category Detection Rules menu item to admin menu
-- =====================================================

DO $$
DECLARE
    admin_parent_id UUID;
    menu_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' AND parent_id IS NULL 
    LIMIT 1;

    -- Get permission ID for cases:manage (or admin:dashboard as fallback)
    SELECT id INTO menu_permission_id 
    FROM admin_permissions 
    WHERE name = 'cases:manage' 
    LIMIT 1;

    IF menu_permission_id IS NULL THEN
        SELECT id INTO menu_permission_id 
        FROM admin_permissions 
        WHERE name = 'admin:dashboard' 
        LIMIT 1;
    END IF;

    IF admin_parent_id IS NOT NULL THEN
        -- Add Category Detection Rules menu item
        INSERT INTO admin_menu_items (
            parent_id, 
            label, 
            label_ar, 
            href, 
            icon, 
            description, 
            sort_order, 
            permission_id
        ) VALUES (
            admin_parent_id,
            'Category Detection Rules',
            'قواعد اكتشاف الفئات',
            '/admin/category-detection-rules',
            'Sparkles',
            'Manage keywords for automatic case categorization',
            (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM admin_menu_items WHERE parent_id = admin_parent_id),
            menu_permission_id
        )
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            updated_at = NOW();
    END IF;
END $$;

