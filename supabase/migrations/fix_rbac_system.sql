-- Fix RBAC System - Comprehensive Setup
-- This script ensures the RBAC system is properly configured

-- 1. Create permission_modules table if it doesn't exist
CREATE TABLE IF NOT EXISTS permission_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create core modules
INSERT INTO permission_modules (name, display_name, description, icon, color, sort_order) VALUES
('dashboard', 'Dashboard', 'Main dashboard and analytics', 'bar-chart-3', 'blue', 1),
('cases', 'Cases', 'Manage donation cases and campaigns', 'heart', 'red', 2),
('contributions', 'Contributions', 'Manage donations and contributions', 'credit-card', 'green', 3),
('beneficiaries', 'Beneficiaries', 'Manage beneficiary profiles', 'users', 'purple', 4),
('admin', 'Administration', 'System administration and management', 'settings', 'gray', 5),
('notifications', 'Notifications', 'System notifications and alerts', 'bell', 'yellow', 6)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- 3. Create core permissions for each module
-- Dashboard permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:dashboard', 'View Dashboard', 'Access the main dashboard', 'dashboard', 'view', (SELECT id FROM permission_modules WHERE name = 'dashboard')),
('view:analytics', 'View Analytics', 'View analytics and statistics', 'analytics', 'view', (SELECT id FROM permission_modules WHERE name = 'dashboard'))
ON CONFLICT (name) DO NOTHING;

-- Cases permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:cases', 'View Cases', 'View all cases', 'cases', 'view', (SELECT id FROM permission_modules WHERE name = 'cases')),
('view:own_cases', 'View Own Cases', 'View cases created by user', 'cases', 'view_own', (SELECT id FROM permission_modules WHERE name = 'cases')),
('create:cases', 'Create Cases', 'Create new cases', 'cases', 'create', (SELECT id FROM permission_modules WHERE name = 'cases')),
('update:cases', 'Update Cases', 'Update existing cases', 'cases', 'update', (SELECT id FROM permission_modules WHERE name = 'cases')),
('update:own_cases', 'Update Own Cases', 'Update cases created by user', 'cases', 'update_own', (SELECT id FROM permission_modules WHERE name = 'cases')),
('delete:cases', 'Delete Cases', 'Delete cases', 'cases', 'delete', (SELECT id FROM permission_modules WHERE name = 'cases')),
('delete:own_cases', 'Delete Own Cases', 'Delete cases created by user', 'cases', 'delete_own', (SELECT id FROM permission_modules WHERE name = 'cases'))
ON CONFLICT (name) DO NOTHING;

-- Contributions permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:contributions', 'View Contributions', 'View all contributions', 'contributions', 'view', (SELECT id FROM permission_modules WHERE name = 'contributions')),
('view:own_contributions', 'View Own Contributions', 'View own contributions', 'contributions', 'view_own', (SELECT id FROM permission_modules WHERE name = 'contributions')),
('create:contributions', 'Create Contributions', 'Make contributions', 'contributions', 'create', (SELECT id FROM permission_modules WHERE name = 'contributions')),
('update:contributions', 'Update Contributions', 'Update contribution status', 'contributions', 'update', (SELECT id FROM permission_modules WHERE name = 'contributions')),
('approve:contributions', 'Approve Contributions', 'Approve or reject contributions', 'contributions', 'approve', (SELECT id FROM permission_modules WHERE name = 'contributions'))
ON CONFLICT (name) DO NOTHING;

-- Beneficiaries permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:beneficiaries', 'View Beneficiaries', 'View all beneficiaries', 'beneficiaries', 'view', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('view:own_beneficiaries', 'View Own Beneficiaries', 'View beneficiaries created by user', 'beneficiaries', 'view_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('create:beneficiaries', 'Create Beneficiaries', 'Create new beneficiaries', 'beneficiaries', 'create', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('update:beneficiaries', 'Update Beneficiaries', 'Update beneficiary information', 'beneficiaries', 'update', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('update:own_beneficiaries', 'Update Own Beneficiaries', 'Update beneficiaries created by user', 'beneficiaries', 'update_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('delete:beneficiaries', 'Delete Beneficiaries', 'Delete beneficiaries', 'beneficiaries', 'delete', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('delete:own_beneficiaries', 'Delete Own Beneficiaries', 'Delete beneficiaries created by user', 'beneficiaries', 'delete_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries'))
ON CONFLICT (name) DO NOTHING;

-- Admin permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:admin', 'View Admin Panel', 'Access admin panel', 'admin', 'view', (SELECT id FROM permission_modules WHERE name = 'admin')),
('manage:users', 'Manage Users', 'Manage user accounts', 'users', 'manage', (SELECT id FROM permission_modules WHERE name = 'admin')),
('manage:rbac', 'Manage RBAC', 'Manage roles and permissions', 'rbac', 'manage', (SELECT id FROM permission_modules WHERE name = 'admin')),
('view:admin_cases', 'View Admin Cases', 'View all cases in admin panel', 'admin_cases', 'view', (SELECT id FROM permission_modules WHERE name = 'admin')),
('view:admin_contributions', 'View Admin Contributions', 'View all contributions in admin panel', 'admin_contributions', 'view', (SELECT id FROM permission_modules WHERE name = 'admin'))
ON CONFLICT (name) DO NOTHING;

-- Notifications permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
('view:notifications', 'View Notifications', 'View notifications', 'notifications', 'view', (SELECT id FROM permission_modules WHERE name = 'notifications')),
('manage:notifications', 'Manage Notifications', 'Manage notification settings', 'notifications', 'manage', (SELECT id FROM permission_modules WHERE name = 'notifications'))
ON CONFLICT (name) DO NOTHING;

-- 4. Create roles if they don't exist
INSERT INTO roles (name, display_name, description, is_system) VALUES
('super_admin', 'Super Administrator', 'Full system access', true),
('admin', 'Administrator', 'Administrative access', true),
('moderator', 'Moderator', 'Moderation access', true),
('donor', 'Donor', 'Donor access', true),
('visitor', 'Visitor', 'Public visitor access', true)
ON CONFLICT (name) DO NOTHING;

-- 5. Assign permissions to roles
-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions except super admin specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name NOT LIKE 'manage:rbac'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Moderator gets limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'moderator'
AND p.name IN (
    'view:dashboard', 'view:analytics',
    'view:cases', 'view:own_cases', 'create:cases', 'update:own_cases',
    'view:contributions', 'view:own_contributions', 'create:contributions', 'approve:contributions',
    'view:beneficiaries', 'view:own_beneficiaries', 'create:beneficiaries', 'update:own_beneficiaries',
    'view:admin', 'view:admin_cases', 'view:admin_contributions',
    'view:notifications'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Donor gets basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'donor'
AND p.name IN (
    'view:dashboard',
    'view:cases', 'view:own_cases', 'create:cases', 'update:own_cases', 'delete:own_cases',
    'view:contributions', 'view:own_contributions', 'create:contributions',
    'view:beneficiaries', 'view:own_beneficiaries', 'create:beneficiaries', 'update:own_beneficiaries', 'delete:own_beneficiaries',
    'view:notifications'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Visitor gets minimal permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'visitor'
AND p.name IN (
    'view:cases'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Add updated_at trigger to permission_modules
DROP TRIGGER IF EXISTS update_permission_modules_updated_at ON permission_modules;
CREATE TRIGGER update_permission_modules_updated_at
    BEFORE UPDATE ON permission_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Show summary
SELECT 'RBAC Setup Complete' as status;
SELECT 'Modules' as type, count(*) as count FROM permission_modules;
SELECT 'Permissions' as type, count(*) as count FROM permissions;
SELECT 'Roles' as type, count(*) as count FROM roles;
SELECT 'Role Permissions' as type, count(*) as count FROM role_permissions;

-- 9. Instructions for assigning user roles
-- After running this script, assign your user to a role with:
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 'YOUR_USER_ID_HERE', r.id, 'YOUR_USER_ID_HERE'
-- FROM roles r
-- WHERE r.name = 'admin'
-- ON CONFLICT (user_id, role_id) DO NOTHING;
