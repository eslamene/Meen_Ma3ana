-- Clean up duplicate menu items and add unique constraint
-- This migration fixes the issue where menu items weren't cleaned before insert

-- ============================================
-- STEP 1: Remove duplicate menu items
-- ============================================

-- Delete duplicates, keeping only the first occurrence (lowest id)
DELETE FROM admin_menu_items a
USING admin_menu_items b
WHERE a.id > b.id
  AND a.href = b.href
  AND (a.parent_id = b.parent_id OR (a.parent_id IS NULL AND b.parent_id IS NULL));

-- ============================================
-- STEP 2: Add unique constraint if it doesn't exist
-- ============================================

-- Check if constraint exists, if not add it
DO $$
BEGIN
    -- Try to add unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_menu_items_href_parent_id_key'
        AND conrelid = 'admin_menu_items'::regclass
    ) THEN
        ALTER TABLE admin_menu_items 
        ADD CONSTRAINT admin_menu_items_href_parent_id_key 
        UNIQUE (href, parent_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
END $$;

-- ============================================
-- STEP 3: Clean up all menu items (fresh start)
-- ============================================

DELETE FROM admin_menu_items;

-- ============================================
-- STEP 4: Insert clean menu structure
-- ============================================

-- Main Navigation (Public/User Menu)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Home', 'الرئيسية', '/', 'Home', 'Home page', 1, NULL),
('Cases', 'الحالات', '/cases', 'Heart', 'Browse donation cases', 2, 
 (SELECT id FROM admin_permissions WHERE name = 'cases:view')),
('Projects', 'المشاريع', '/projects', 'FolderKanban', 'Browse projects', 3, NULL),
('Dashboard', 'لوحة التحكم', '/dashboard', 'BarChart3', 'User dashboard', 4,
 (SELECT id FROM admin_permissions WHERE name = 'dashboard:view')),
('Notifications', 'الإشعارات', '/notifications', 'Bell', 'View notifications', 5, NULL),
('My Contributions', 'مساهماتي', '/contributions', 'DollarSign', 'View my contributions', 6,
 (SELECT id FROM admin_permissions WHERE name = 'contributions:read')),
('Profile', 'الملف الشخصي', '/profile', 'UserCog', 'View profile', 7,
 (SELECT id FROM admin_permissions WHERE name = 'profile:view'))
ON CONFLICT (href, parent_id) DO UPDATE SET
    label = EXCLUDED.label,
    label_ar = EXCLUDED.label_ar,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    sort_order = EXCLUDED.sort_order,
    permission_id = EXCLUDED.permission_id,
    updated_at = NOW();

-- Admin Menu (Parent Item)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Administration', 'الإدارة', '/admin', 'Settings', 'Admin panel', 10,
 (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard'))
ON CONFLICT (href, parent_id) DO UPDATE SET
    label = EXCLUDED.label,
    label_ar = EXCLUDED.label_ar,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    sort_order = EXCLUDED.sort_order,
    permission_id = EXCLUDED.permission_id,
    updated_at = NOW();

-- Admin Sub-Menu Items
DO $$
DECLARE
    admin_parent_id UUID;
BEGIN
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    IF admin_parent_id IS NOT NULL THEN
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Dashboard', 'لوحة التحكم', '/admin', 'BarChart3', 'Admin dashboard', 1,
         (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard')),
        (admin_parent_id, 'Cases', 'الحالات', '/admin/cases', 'Heart', 'Manage cases', 2,
         (SELECT id FROM admin_permissions WHERE name = 'cases:manage')),
        (admin_parent_id, 'Contributions', 'المساهمات', '/admin/contributions', 'DollarSign', 'Manage contributions', 3,
         (SELECT id FROM admin_permissions WHERE name = 'contributions:manage')),
        (admin_parent_id, 'Sponsorships', 'الرعايات', '/admin/sponsorships', 'UserPlus', 'Manage sponsorships', 4,
         (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard')),
        (admin_parent_id, 'Analytics', 'التحليلات', '/admin/analytics', 'LineChart', 'View analytics', 5,
         (SELECT id FROM admin_permissions WHERE name = 'admin:analytics')),
        (admin_parent_id, 'Categories', 'الفئات', '/admin/categories', 'FileText', 'Manage categories', 6,
         (SELECT id FROM admin_permissions WHERE name = 'cases:manage')),
        (admin_parent_id, 'Users', 'المستخدمون', '/admin/users', 'Users', 'Manage users', 7,
         (SELECT id FROM admin_permissions WHERE name = 'admin:users')),
        (admin_parent_id, 'Access Control', 'التحكم في الوصول', '/admin/access-control/users', 'Shield', 'Manage access control', 8,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            updated_at = NOW();
    END IF;
END $$;

-- Access Control Sub-Menu
DO $$
DECLARE
    access_control_parent_id UUID;
BEGIN
    SELECT id INTO access_control_parent_id FROM admin_menu_items WHERE href = '/admin/access-control/users' AND parent_id IS NOT NULL LIMIT 1;
    
    IF access_control_parent_id IS NOT NULL THEN
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (access_control_parent_id, 'Users', 'المستخدمون', '/admin/access-control/users', 'Users', 'Manage user roles', 1,
         (SELECT id FROM admin_permissions WHERE name = 'admin:users')),
        (access_control_parent_id, 'Roles', 'الأدوار', '/admin/access-control/roles', 'ShieldCheck', 'Manage roles', 2,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles')),
        (access_control_parent_id, 'Permissions', 'الصلاحيات', '/admin/access-control/permissions', 'Shield', 'Manage permissions', 3,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles')),
        (access_control_parent_id, 'Modules', 'الوحدات', '/admin/access-control/modules', 'GitBranch', 'Manage modules', 4,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT (href, parent_id) DO UPDATE SET
            label = EXCLUDED.label,
            label_ar = EXCLUDED.label_ar,
            icon = EXCLUDED.icon,
            description = EXCLUDED.description,
            description_ar = EXCLUDED.description_ar,
            sort_order = EXCLUDED.sort_order,
            permission_id = EXCLUDED.permission_id,
            updated_at = NOW();
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify menu structure
SELECT 
    '✅ Menu Cleanup Complete' as check_name,
    COUNT(*) as total_items,
    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_items,
    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as sub_items,
    COUNT(DISTINCT href) as unique_hrefs
FROM admin_menu_items
WHERE is_active = true;

