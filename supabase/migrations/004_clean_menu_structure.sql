-- Clean Menu Structure Based on Actual Pages
-- This replaces placeholder menu items with real pages from the application

-- ============================================
-- CLEANUP: Remove placeholder/garbage menu items
-- ============================================

-- Delete all existing menu items (we'll recreate them properly)
DELETE FROM admin_menu_items;

-- ============================================
-- MAIN NAVIGATION (Public/User Menu)
-- ============================================

-- Home (Public)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Home', 'الرئيسية', '/', 'Home', 'Home page', 1, NULL)
ON CONFLICT DO NOTHING;

-- Cases (Public with permission check)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Cases', 'الحالات', '/cases', 'Heart', 'Browse donation cases', 2, 
 (SELECT id FROM admin_permissions WHERE name = 'cases:view'))
ON CONFLICT DO NOTHING;

-- Projects (Public)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Projects', 'المشاريع', '/projects', 'FolderKanban', 'Browse projects', 3, NULL)
ON CONFLICT DO NOTHING;

-- Dashboard (Requires dashboard:view)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Dashboard', 'لوحة التحكم', '/dashboard', 'BarChart3', 'User dashboard', 4,
 (SELECT id FROM admin_permissions WHERE name = 'dashboard:view'))
ON CONFLICT DO NOTHING;

-- Notifications (Authenticated users)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Notifications', 'الإشعارات', '/notifications', 'Bell', 'View notifications', 5, NULL)
ON CONFLICT DO NOTHING;

-- My Contributions (Requires contributions:read)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('My Contributions', 'مساهماتي', '/contributions', 'DollarSign', 'View my contributions', 6,
 (SELECT id FROM admin_permissions WHERE name = 'contributions:read'))
ON CONFLICT DO NOTHING;

-- Profile (Requires profile:view)
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Profile', 'الملف الشخصي', '/profile', 'UserCog', 'View profile', 7,
 (SELECT id FROM admin_permissions WHERE name = 'profile:view'))
ON CONFLICT DO NOTHING;

-- ============================================
-- ADMIN MENU (Parent Item)
-- ============================================

INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id) VALUES
('Administration', 'الإدارة', '/admin', 'Settings', 'Admin panel', 10,
 (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard'))
ON CONFLICT DO NOTHING;

-- ============================================
-- ADMIN SUB-MENU ITEMS
-- ============================================

DO $$
DECLARE
    admin_parent_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' LIMIT 1;
    
    IF admin_parent_id IS NOT NULL THEN
        -- Admin Dashboard
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Dashboard', 'لوحة التحكم', '/admin', 'BarChart3', 'Admin dashboard', 1,
         (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard'))
        ON CONFLICT DO NOTHING;
        
        -- Cases Management (Actual page: /admin/cases)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Cases', 'الحالات', '/admin/cases', 'Heart', 'Manage cases', 2,
         (SELECT id FROM admin_permissions WHERE name = 'cases:manage'))
        ON CONFLICT DO NOTHING;
        
        -- Contributions Management (Actual page: /admin/contributions)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Contributions', 'المساهمات', '/admin/contributions', 'DollarSign', 'Manage contributions', 3,
         (SELECT id FROM admin_permissions WHERE name = 'contributions:manage'))
        ON CONFLICT DO NOTHING;
        
        -- Sponsorships (Actual page: /admin/sponsorships)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Sponsorships', 'الرعايات', '/admin/sponsorships', 'UserPlus', 'Manage sponsorships', 4,
         (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard'))
        ON CONFLICT DO NOTHING;
        
        -- Analytics (Actual page: /admin/analytics)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Analytics', 'التحليلات', '/admin/analytics', 'LineChart', 'View analytics', 5,
         (SELECT id FROM admin_permissions WHERE name = 'admin:analytics'))
        ON CONFLICT DO NOTHING;
        
        -- Categories (Actual page: /admin/categories)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Categories', 'الفئات', '/admin/categories', 'FileText', 'Manage categories', 6,
         (SELECT id FROM admin_permissions WHERE name = 'cases:manage'))
        ON CONFLICT DO NOTHING;
        
        -- Users (Actual page: /admin/users)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Users', 'المستخدمون', '/admin/users', 'Users', 'Manage users', 7,
         (SELECT id FROM admin_permissions WHERE name = 'admin:users'))
        ON CONFLICT DO NOTHING;
        
        -- Access Control (Parent for access control sub-items)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (admin_parent_id, 'Access Control', 'التحكم في الوصول', '/admin/access-control/users', 'Shield', 'Manage access control', 8,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- ACCESS CONTROL SUB-MENU
-- ============================================

DO $$
DECLARE
    access_control_parent_id UUID;
BEGIN
    -- Get access control parent menu item ID
    SELECT id INTO access_control_parent_id FROM admin_menu_items WHERE href = '/admin/access-control/users' AND parent_id IS NOT NULL LIMIT 1;
    
    IF access_control_parent_id IS NOT NULL THEN
        -- Users (Actual page: /admin/access-control/users)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (access_control_parent_id, 'Users', 'المستخدمون', '/admin/access-control/users', 'Users', 'Manage user roles', 1,
         (SELECT id FROM admin_permissions WHERE name = 'admin:users'))
        ON CONFLICT DO NOTHING;
        
        -- Roles (Actual page: /admin/access-control/roles)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (access_control_parent_id, 'Roles', 'الأدوار', '/admin/access-control/roles', 'ShieldCheck', 'Manage roles', 2,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT DO NOTHING;
        
        -- Permissions (Actual page: /admin/access-control/permissions)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (access_control_parent_id, 'Permissions', 'الصلاحيات', '/admin/access-control/permissions', 'Shield', 'Manage permissions', 3,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT DO NOTHING;
        
        -- Modules (Actual page: /admin/access-control/modules)
        INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id) VALUES
        (access_control_parent_id, 'Modules', 'الوحدات', '/admin/access-control/modules', 'GitBranch', 'Manage modules', 4,
         (SELECT id FROM admin_permissions WHERE name = 'admin:roles'))
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify menu structure
SELECT 
    '✅ Menu Structure' as check_name,
    COUNT(*) as total_items,
    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_items,
    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as sub_items
FROM admin_menu_items
WHERE is_active = true;

-- Show menu tree
SELECT 
    CASE 
        WHEN parent_id IS NULL THEN label
        ELSE '  └─ ' || label
    END as menu_tree,
    href,
    (SELECT name FROM admin_permissions WHERE id = permission_id) as required_permission
FROM admin_menu_items
WHERE is_active = true
ORDER BY sort_order, parent_id NULLS FIRST;

