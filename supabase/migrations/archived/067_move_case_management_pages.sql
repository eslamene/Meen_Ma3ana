-- Migration: Move Case Management Pages from /admin/ to /case-management/
-- This updates menu items to reflect the new route structure

-- ============================================
-- UPDATE CASE MANAGEMENT MENU ITEMS
-- ============================================

-- Update Admin Dashboard to Case Management Dashboard
UPDATE admin_menu_items 
SET 
  href = '/case-management',
  label = 'Dashboard',
  label_ar = 'لوحة التحكم',
  description = 'Case management dashboard',
  description_ar = 'لوحة تحكم إدارة الحالات'
WHERE href = '/admin' AND parent_id IS NOT NULL;

-- Update Cases Management
UPDATE admin_menu_items 
SET 
  href = '/case-management/cases',
  description = 'Manage cases',
  description_ar = 'إدارة الحالات'
WHERE href = '/admin/cases';

-- Update Contributions Management
UPDATE admin_menu_items 
SET 
  href = '/case-management/contributions',
  description = 'Manage contributions',
  description_ar = 'إدارة المساهمات'
WHERE href = '/admin/contributions';

-- Update Sponsorships
UPDATE admin_menu_items 
SET 
  href = '/case-management/sponsorships',
  description = 'Manage sponsorships',
  description_ar = 'إدارة الرعايات'
WHERE href = '/admin/sponsorships';

-- Update Analytics
UPDATE admin_menu_items 
SET 
  href = '/case-management/analytics',
  description = 'View analytics',
  description_ar = 'عرض التحليلات'
WHERE href = '/admin/analytics';

-- Update Beneficiaries (if it exists in menu)
UPDATE admin_menu_items 
SET 
  href = '/case-management/beneficiaries',
  description = 'Manage beneficiaries',
  description_ar = 'إدارة المستفيدين'
WHERE href = '/beneficiaries' AND parent_id IS NOT NULL;

-- Add Beneficiaries menu item if it doesn't exist
DO $$
DECLARE
    case_mgmt_parent_id UUID;
    beneficiaries_exists BOOLEAN;
BEGIN
    -- Get case management parent menu item ID
    SELECT id INTO case_mgmt_parent_id FROM admin_menu_items WHERE href = '/case-management' AND parent_id IS NULL LIMIT 1;
    
    -- Check if beneficiaries menu item already exists
    SELECT EXISTS(
        SELECT 1 FROM admin_menu_items 
        WHERE href = '/case-management/beneficiaries' AND parent_id = case_mgmt_parent_id
    ) INTO beneficiaries_exists;
    
    IF case_mgmt_parent_id IS NOT NULL AND NOT beneficiaries_exists THEN
        -- Add Beneficiaries menu item
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (case_mgmt_parent_id, 'Beneficiaries', 'المستفيدون', '/case-management/beneficiaries', 'Users', 'Manage beneficiaries', 3,
         (SELECT id FROM admin_permissions WHERE name = 'beneficiaries:view'))
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Update parent menu item (Administration) to point to case-management
UPDATE admin_menu_items 
SET 
  href = '/case-management',
  description = 'Case management panel',
  description_ar = 'لوحة إدارة الحالات'
WHERE href = '/admin' AND parent_id IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show updated menu structure
SELECT 
    CASE 
        WHEN parent_id IS NULL THEN label
        ELSE '  └─ ' || label
    END as menu_tree,
    href,
    (SELECT name FROM admin_permissions WHERE id = permission_id) as required_permission
FROM admin_menu_items
WHERE is_active = true
AND (href LIKE '/case-management%' OR href LIKE '/admin%')
ORDER BY sort_order, parent_id NULLS FIRST;

