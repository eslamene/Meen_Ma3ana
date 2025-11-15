-- Migration: Add Cases and Admin Cases menu items with permissions
-- This migration ensures that all case-related menu items exist with proper permissions

-- ============================================
-- MAIN NAVIGATION: Cases Menu Item
-- ============================================

-- Cases (Browse cases) - Main navigation
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) 
VALUES (
  'Cases', 
  'الحالات', 
  '/cases', 
  'Heart', 
  'Browse donation cases', 
  2, 
  (SELECT id FROM admin_permissions WHERE name = 'cases:view')
)
ON CONFLICT (href, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
DO UPDATE SET
  label = EXCLUDED.label,
  label_ar = EXCLUDED.label_ar,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  permission_id = EXCLUDED.permission_id;

-- ============================================
-- ADMIN MENU: Cases Management
-- ============================================

DO $$
DECLARE
    admin_parent_id UUID;
    cases_manage_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin' 
      AND parent_id IS NULL 
    LIMIT 1;
    
    -- Get cases:manage permission ID
    SELECT id INTO cases_manage_permission_id 
    FROM admin_permissions 
    WHERE name = 'cases:manage' 
    LIMIT 1;
    
    IF admin_parent_id IS NULL THEN
        RAISE WARNING 'Admin parent menu item not found. Skipping admin cases menu item.';
    ELSIF cases_manage_permission_id IS NULL THEN
        RAISE WARNING 'cases:manage permission not found. Skipping admin cases menu item.';
    ELSE
        -- Admin Cases Management
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) 
        VALUES (
          admin_parent_id,
          'Cases', 
          'الحالات', 
          '/admin/cases', 
          'Heart', 
          'Manage cases', 
          2, 
          cases_manage_permission_id
        )
        ON CONFLICT (href, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
        DO UPDATE SET
          label = EXCLUDED.label,
          label_ar = EXCLUDED.label_ar,
          icon = EXCLUDED.icon,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order,
          permission_id = EXCLUDED.permission_id;
        
        RAISE NOTICE 'Successfully added/updated admin cases menu item';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    cases_menu_count INTEGER;
    admin_cases_menu_count INTEGER;
BEGIN
    -- Count main navigation Cases menu item
    SELECT COUNT(*) INTO cases_menu_count
    FROM admin_menu_items
    WHERE href = '/cases' 
      AND parent_id IS NULL
      AND permission_id = (SELECT id FROM admin_permissions WHERE name = 'cases:view');
    
    -- Count admin Cases menu item
    SELECT COUNT(*) INTO admin_cases_menu_count
    FROM admin_menu_items
    WHERE href = '/admin/cases' 
      AND parent_id IS NOT NULL
      AND permission_id = (SELECT id FROM admin_permissions WHERE name = 'cases:manage');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Menu Items Verification:';
    RAISE NOTICE '  Main Cases menu item: %', 
      CASE WHEN cases_menu_count > 0 THEN '✅ Found' ELSE '❌ Missing' END;
    RAISE NOTICE '  Admin Cases menu item: %', 
      CASE WHEN admin_cases_menu_count > 0 THEN '✅ Found' ELSE '❌ Missing' END;
    RAISE NOTICE '========================================';
END $$;

