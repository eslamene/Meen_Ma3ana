-- ============================================
-- COMPREHENSIVE ADMIN SYSTEM SETUP & MIGRATION
-- This script FIRST cleans up old RBAC system, THEN creates the new clean admin system
-- Run this once to set up everything
-- ============================================

-- ============================================
-- PART 0: CLEANUP OLD RBAC SYSTEM FIRST
-- ============================================

BEGIN;

-- Drop all views that depend on rbac_ tables
DROP VIEW IF EXISTS rbac_audit_summary CASCADE;
DROP VIEW IF EXISTS rbac_permission_change_audit CASCADE;
DROP VIEW IF EXISTS rbac_role_assignment_audit CASCADE;

-- Drop junction tables first (they have foreign keys)
DROP TABLE IF EXISTS rbac_permission_group_assignments CASCADE;
DROP TABLE IF EXISTS rbac_role_permissions CASCADE;
DROP TABLE IF EXISTS rbac_user_roles CASCADE;

-- Drop audit tables
DROP TABLE IF EXISTS rbac_audit_log CASCADE;
DROP TABLE IF EXISTS rbac_permission_change_audit CASCADE;
DROP TABLE IF EXISTS rbac_role_assignment_audit CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS rbac_permission_groups CASCADE;
DROP TABLE IF EXISTS rbac_permissions CASCADE;
DROP TABLE IF EXISTS rbac_modules CASCADE;
DROP TABLE IF EXISTS rbac_roles CASCADE;

-- Drop any functions related to old RBAC system
DROP FUNCTION IF EXISTS get_user_rbac_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_rbac_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_rbac_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_rbac_role(UUID, TEXT) CASCADE;

-- Clean up any remaining old RBAC tables (catch-all)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'rbac_%'
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Clean up any views that might exist with rbac_ prefix
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname LIKE 'rbac_%'
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- PART 1: CREATE CLEAN ADMIN SYSTEM TABLES
-- ============================================

BEGIN;

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    display_name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    display_name_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ROLE-PERMISSION ASSIGNMENTS
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 4. USER-ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS admin_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- 5. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS admin_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES admin_menu_items(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    label_ar VARCHAR(100),
    href VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    description_ar TEXT,
    sort_order INTEGER DEFAULT 0,
    permission_id UUID REFERENCES admin_permissions(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate menu items with same href and parent
    UNIQUE(href, parent_id)
);

-- ============================================
-- PART 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_role_id ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission_id ON admin_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user_id ON admin_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role_id ON admin_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_active ON admin_user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource_action ON admin_permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_admin_menu_items_parent_id ON admin_menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_menu_items_sort_order ON admin_menu_items(sort_order);

-- ============================================
-- PART 3: INSERT DEFAULT ROLES
-- ============================================

INSERT INTO admin_roles (name, display_name, display_name_ar, description, description_ar, level, is_system) VALUES
('visitor', 'Visitor', 'زائر', 'Unauthenticated users', 'المستخدمون غير المصرح لهم', 0, true),
('donor', 'Donor', 'متبرع', 'Can make contributions', 'يمكنه التبرع', 1, true),
('moderator', 'Moderator', 'مشرف', 'Can moderate content and manage cases', 'يمكنه إدارة المحتوى والحالات', 2, true),
('admin', 'Administrator', 'مدير', 'Full system access', 'وصول كامل للنظام', 3, true),
('super_admin', 'Super Administrator', 'مدير عام', 'Full system access with system management', 'وصول كامل مع إدارة النظام', 4, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 4: INSERT DEFAULT PERMISSIONS
-- ============================================

INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system) VALUES
-- Dashboard permissions
('dashboard:view', 'View Dashboard', 'عرض لوحة التحكم', 'Access the main dashboard', 'dashboard', 'view', true),
('dashboard:analytics', 'View Analytics', 'عرض التحليلات', 'View analytics and reports', 'dashboard', 'analytics', true),

-- Cases permissions
('cases:view', 'View Cases', 'عرض الحالات', 'View donation cases', 'cases', 'view', true),
('cases:create', 'Create Cases', 'إنشاء حالات', 'Create new donation cases', 'cases', 'create', true),
('cases:update', 'Update Cases', 'تحديث الحالات', 'Edit existing cases', 'cases', 'update', true),
('cases:delete', 'Delete Cases', 'حذف الحالات', 'Delete cases', 'cases', 'delete', true),
('cases:manage', 'Manage Cases', 'إدارة الحالات', 'Full case management', 'cases', 'manage', true),

-- Contributions permissions
('contributions:view', 'View Contributions', 'عرض المساهمات', 'View contributions', 'contributions', 'view', true),
('contributions:read', 'Read Contributions', 'قراءة المساهمات', 'Read/view own contributions', 'contributions', 'read', true),
('contributions:create', 'Create Contributions', 'إنشاء مساهمات', 'Make contributions', 'contributions', 'create', true),
('contributions:approve', 'Approve Contributions', 'الموافقة على المساهمات', 'Approve pending contributions', 'contributions', 'approve', true),
('contributions:manage', 'Manage Contributions', 'إدارة المساهمات', 'Full contribution management', 'contributions', 'manage', true),

-- Admin permissions
('admin:dashboard', 'Admin Dashboard', 'لوحة تحكم المدير', 'Access admin dashboard', 'admin', 'dashboard', true),
('admin:users', 'Manage Users', 'إدارة المستخدمين', 'Manage user accounts', 'admin', 'users', true),
('admin:roles', 'Manage Roles', 'إدارة الأدوار', 'Manage roles and permissions', 'admin', 'roles', true),
('admin:settings', 'System Settings', 'إعدادات النظام', 'Access system settings', 'admin', 'settings', true),
('admin:analytics', 'View Analytics', 'عرض التحليلات', 'View admin analytics', 'admin', 'analytics', true),

-- Profile permissions
('profile:view', 'View Profile', 'عرض الملف الشخصي', 'View own profile', 'profile', 'view', true),
('profile:update', 'Update Profile', 'تحديث الملف الشخصي', 'Update own profile', 'profile', 'update', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 5: ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ============================================

-- Donor permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'donor'
AND p.name IN ('dashboard:view', 'cases:view', 'contributions:view', 'contributions:read', 'contributions:create', 'profile:view', 'profile:update')
ON CONFLICT DO NOTHING;

-- Moderator permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'moderator'
AND p.name IN ('dashboard:view', 'dashboard:analytics', 'cases:view', 'cases:create', 'cases:update', 'cases:manage', 
               'contributions:view', 'contributions:read', 'contributions:approve', 'contributions:manage', 'profile:view', 'profile:update')
ON CONFLICT DO NOTHING;

-- Admin permissions (all except super_admin specific)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin'
AND p.name NOT LIKE 'super:%'
ON CONFLICT DO NOTHING;

-- Super Admin permissions (all)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: INSERT CLEAN MENU ITEMS (Based on Actual Pages)
-- ============================================

-- Clean up existing menu items first (to avoid duplicates)
-- This ensures a clean slate before inserting new menu items
DELETE FROM admin_menu_items;

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
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' LIMIT 1;
    
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
-- PART 7: SET UP RLS POLICIES
-- ============================================

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can view active permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Anyone can view role permissions" ON admin_role_permissions;
DROP POLICY IF EXISTS "Users can view their own roles" ON admin_user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON admin_user_roles;
DROP POLICY IF EXISTS "Anyone can view active menu items" ON admin_menu_items;

-- Roles: Everyone can read active roles
CREATE POLICY "Anyone can view active roles" ON admin_roles
    FOR SELECT USING (is_active = true);

-- Permissions: Everyone can read active permissions
CREATE POLICY "Anyone can view active permissions" ON admin_permissions
    FOR SELECT USING (is_active = true);

-- Role-Permissions: Everyone can read
CREATE POLICY "Anyone can view role permissions" ON admin_role_permissions
    FOR SELECT USING (true);

-- User-Roles: Users can view their own roles
CREATE POLICY "Users can view their own roles" ON admin_user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all user roles
CREATE POLICY "Admins can view all user roles" ON admin_user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- Menu Items: Everyone can read active menu items
CREATE POLICY "Anyone can view active menu items" ON admin_menu_items
    FOR SELECT USING (is_active = true);

-- ============================================
-- PART 8: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM admin_user_roles ur
        JOIN admin_role_permissions rp ON ur.role_id = rp.role_id
        JOIN admin_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_has_permission.user_id
        AND ur.is_active = true
        AND p.name = permission_name
        AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM admin_user_roles ur
        JOIN admin_roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_has_role.user_id
        AND ur.is_active = true
        AND r.name = role_name
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible menu items
CREATE OR REPLACE FUNCTION get_user_menu_items(user_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    label VARCHAR,
    label_ar VARCHAR,
    href VARCHAR,
    icon VARCHAR,
    description TEXT,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.parent_id,
        mi.label,
        mi.label_ar,
        mi.href,
        mi.icon,
        mi.description,
        mi.sort_order
    FROM admin_menu_items mi
    WHERE mi.is_active = true
    AND (
        mi.permission_id IS NULL -- Public menu items
        OR user_has_permission(user_id, (SELECT name FROM admin_permissions WHERE id = mi.permission_id))
    )
    ORDER BY mi.sort_order, mi.label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permission names
CREATE OR REPLACE FUNCTION get_user_permission_names(user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT p.name
        FROM admin_user_roles ur
        JOIN admin_role_permissions rp ON ur.role_id = rp.role_id
        JOIN admin_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = get_user_permission_names.user_id
        AND ur.is_active = true
        AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 9: MIGRATE EXISTING USERS
-- ============================================

-- Assign 'donor' role to all existing users
INSERT INTO admin_user_roles (user_id, role_id, is_active)
SELECT 
    u.id,
    r.id,
    true
FROM auth.users u
CROSS JOIN admin_roles r
WHERE r.name = 'donor'
AND NOT EXISTS (
    SELECT 1 FROM admin_user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

COMMIT;

-- ============================================
-- PART 10: VERIFICATION QUERIES
-- ============================================

-- Verify 0: Check old RBAC tables are gone
SELECT 
    '✅ Old RBAC Cleanup' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'All old rbac_ tables removed'
        ELSE 'Warning: ' || COUNT(*)::TEXT || ' rbac_ tables still exist'
    END as status
FROM (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'rbac_%'
    UNION ALL
    SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'rbac_%'
) old_rbac_objects;

-- Verify 1: Check roles were created
SELECT 
    '✅ Roles Created' as check_name,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as roles
FROM admin_roles
WHERE is_active = true;

-- Verify 2: Check permissions were created
SELECT 
    '✅ Permissions Created' as check_name,
    COUNT(*) as total_permissions,
    COUNT(DISTINCT resource) as resources
FROM admin_permissions
WHERE is_active = true;

-- Verify 3: Check role-permission assignments
SELECT 
    '✅ Role-Permission Assignments' as check_name,
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM admin_roles r
LEFT JOIN admin_role_permissions rp ON r.id = rp.role_id
WHERE r.is_active = true
GROUP BY r.name, r.level
ORDER BY r.level;

-- Verify 4: Check menu items were created
SELECT 
    '✅ Menu Items Created' as check_name,
    COUNT(*) as total_items,
    COUNT(DISTINCT parent_id) FILTER (WHERE parent_id IS NOT NULL) as sub_items
FROM admin_menu_items
WHERE is_active = true;

-- Verify 5: Check user role assignments
SELECT 
    '✅ User Role Assignments' as check_name,
    r.name as role_name,
    COUNT(ur.user_id) as user_count
FROM admin_roles r
LEFT JOIN admin_user_roles ur ON r.id = ur.role_id AND ur.is_active = true
GROUP BY r.name, r.level
ORDER BY r.level;

-- Verify 6: Check users without roles (should be minimal)
SELECT 
    '⚠️ Users Without Roles' as check_name,
    COUNT(*) as user_count
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM admin_user_roles ur 
    WHERE ur.user_id = u.id AND ur.is_active = true
);

-- Verify 7: Display sample user role assignments
SELECT 
    '📋 Sample User Role Assignments' as check_name,
    u.email,
    r.name as role_name,
    r.display_name,
    ur.assigned_at,
    ur.is_active
FROM auth.users u
JOIN admin_user_roles ur ON u.id = ur.user_id
JOIN admin_roles r ON ur.role_id = r.id
WHERE ur.is_active = true
ORDER BY u.email, r.level DESC
LIMIT 10;

-- Verify 8: Test helper functions
SELECT 
    '🧪 Testing Helper Functions' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM admin_user_roles LIMIT 1) THEN
            (SELECT user_has_role(user_id, 'donor') FROM admin_user_roles LIMIT 1)
        ELSE false
    END as can_test_permission_function,
    CASE 
        WHEN EXISTS (SELECT 1 FROM admin_user_roles LIMIT 1) THEN
            (SELECT user_has_permission(user_id, 'dashboard:view') FROM admin_user_roles LIMIT 1)
        ELSE false
    END as can_test_role_function;

-- Final Summary
SELECT 
    '📊 SETUP SUMMARY' as section,
    (SELECT COUNT(*) FROM admin_roles WHERE is_active = true) as roles_created,
    (SELECT COUNT(*) FROM admin_permissions WHERE is_active = true) as permissions_created,
    (SELECT COUNT(*) FROM admin_role_permissions) as role_permission_assignments,
    (SELECT COUNT(*) FROM admin_menu_items WHERE is_active = true) as menu_items_created,
    (SELECT COUNT(*) FROM admin_user_roles WHERE is_active = true) as user_role_assignments,
    (SELECT COUNT(*) FROM auth.users) as total_users;
