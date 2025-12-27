-- =====================================================
-- Migration: Update Case Create and Edit Menu Item Paths
-- This updates menu items to reflect the new route structure:
-- /cases/create -> /case-management/create
-- /cases/[id]/edit -> /case-management/cases/[id]/edit
-- =====================================================

-- ============================================
-- UPDATE CASE CREATE MENU ITEMS
-- ============================================

-- Update any menu items that reference /cases/create to /case-management/create
UPDATE admin_menu_items 
SET 
  href = '/case-management/create',
  description = 'Create new case',
  description_ar = 'إنشاء حالة جديدة',
  updated_at = NOW()
WHERE href = '/cases/create';

-- ============================================
-- UPDATE CASE EDIT MENU ITEMS
-- ============================================

-- Note: Edit pages use dynamic routes with [id], so we need to handle pattern matching
-- Update any menu items that might reference edit paths
-- Since edit is typically accessed via buttons, there may not be direct menu items,
-- but we'll update any that exist

-- Update any menu items with edit in the path (if they exist)
UPDATE admin_menu_items 
SET 
  href = REPLACE(href, '/cases/', '/case-management/cases/'),
  updated_at = NOW()
WHERE href LIKE '%/cases/%/edit%'
  AND href NOT LIKE '/case-management/cases/%/edit%';

-- ============================================
-- ENSURE PERMISSIONS ARE CORRECT
-- ============================================

-- Ensure create menu item has cases:create permission
UPDATE admin_menu_items 
SET 
  permission_id = (SELECT id FROM admin_permissions WHERE name = 'cases:create'),
  updated_at = NOW()
WHERE href = '/case-management/create'
  AND (permission_id IS NULL OR permission_id != (SELECT id FROM admin_permissions WHERE name = 'cases:create'));

-- Ensure edit menu items have cases:update permission
UPDATE admin_menu_items 
SET 
  permission_id = (SELECT id FROM admin_permissions WHERE name = 'cases:update'),
  updated_at = NOW()
WHERE href LIKE '/case-management/cases/%/edit%'
  AND (permission_id IS NULL OR permission_id != (SELECT id FROM admin_permissions WHERE name = 'cases:update'));

-- ============================================
-- ADD CREATE CASE MENU ITEM IF IT DOESN'T EXIST
-- ============================================

DO $$
DECLARE
    case_mgmt_parent_id UUID;
    cases_create_permission_id UUID;
    create_item_exists BOOLEAN;
BEGIN
    -- Get case management parent menu item ID
    SELECT id INTO case_mgmt_parent_id 
    FROM admin_menu_items 
    WHERE href = '/case-management' 
      AND parent_id IS NULL 
    LIMIT 1;
    
    -- Get cases:create permission ID
    SELECT id INTO cases_create_permission_id 
    FROM admin_permissions 
    WHERE name = 'cases:create' 
    LIMIT 1;
    
    -- Check if create menu item already exists (with the specific parent)
    SELECT EXISTS(
        SELECT 1 FROM admin_menu_items 
        WHERE href = '/case-management/create'
          AND parent_id = case_mgmt_parent_id
    ) INTO create_item_exists;
    
    -- Add Create Case menu item if parent exists and item doesn't exist
    IF case_mgmt_parent_id IS NOT NULL AND NOT create_item_exists AND cases_create_permission_id IS NOT NULL THEN
        -- Use INSERT with ON CONFLICT matching the actual constraint (href, parent_id)
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
            case_mgmt_parent_id,
            'Create Case',
            'إنشاء حالة',
            '/case-management/create',
            'Plus',
            'Create new case',
            'إنشاء حالة جديدة',
            1,
            cases_create_permission_id,
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
        
        RAISE NOTICE 'Successfully added/updated Create Case menu item';
    ELSIF case_mgmt_parent_id IS NULL THEN
        RAISE WARNING 'Case management parent menu item not found. Skipping Create Case menu item.';
    ELSIF cases_create_permission_id IS NULL THEN
        RAISE WARNING 'cases:create permission not found. Skipping Create Case menu item.';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show updated menu structure for case management
DO $$
DECLARE
    menu_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO menu_count
    FROM admin_menu_items
    WHERE href LIKE '/case-management%'
      AND is_active = true;
    
    RAISE NOTICE 'Found % active case management menu item(s)', menu_count;
    
    -- Show case management menu items
    RAISE NOTICE 'Case Management Menu Items:';
    FOR menu_count IN 
        SELECT 
            CASE 
                WHEN parent_id IS NULL THEN label
                ELSE '  └─ ' || label
            END as menu_tree,
            href,
            (SELECT name FROM admin_permissions WHERE id = permission_id) as required_permission
        FROM admin_menu_items
        WHERE href LIKE '/case-management%'
          AND is_active = true
        ORDER BY sort_order, parent_id NULLS FIRST
    LOOP
        -- This will be shown in the query results
    END LOOP;
END $$;

-- Return verification query
SELECT 
    CASE 
        WHEN parent_id IS NULL THEN label
        ELSE '  └─ ' || label
    END as menu_tree,
    href,
    (SELECT name FROM admin_permissions WHERE id = permission_id) as required_permission,
    is_active
FROM admin_menu_items
WHERE href LIKE '/case-management%'
ORDER BY sort_order, parent_id NULLS FIRST;

