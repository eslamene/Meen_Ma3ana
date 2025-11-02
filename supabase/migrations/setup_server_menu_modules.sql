-- Setup Server Menu Modules
-- This script ensures the rbac_modules table has the necessary data for the server-side menu system

-- Update existing modules to ensure they have correct data
UPDATE rbac_modules SET 
    display_name = 'Dashboard',
    description = 'Main dashboard and analytics',
    icon = 'bar-chart-3',
    color = 'blue',
    sort_order = 1,
    is_active = true,
    updated_at = NOW()
WHERE name = 'dashboard';

UPDATE rbac_modules SET 
    display_name = 'Cases',
    description = 'Manage donation cases and campaigns',
    icon = 'heart',
    color = 'red',
    sort_order = 2,
    is_active = true,
    updated_at = NOW()
WHERE name = 'cases';

UPDATE rbac_modules SET 
    display_name = 'Contributions',
    description = 'Manage donations and contributions',
    icon = 'credit-card',
    color = 'green',
    sort_order = 3,
    is_active = true,
    updated_at = NOW()
WHERE name = 'contributions';

UPDATE rbac_modules SET 
    display_name = 'Beneficiaries',
    description = 'Manage beneficiary profiles',
    icon = 'users',
    color = 'purple',
    sort_order = 4,
    is_active = true,
    updated_at = NOW()
WHERE name = 'beneficiaries';

UPDATE rbac_modules SET 
    display_name = 'Administration',
    description = 'System administration and management',
    icon = 'settings',
    color = 'gray',
    sort_order = 5,
    is_active = true,
    updated_at = NOW()
WHERE name = 'admin';

UPDATE rbac_modules SET 
    display_name = 'Notifications',
    description = 'System notifications and alerts',
    icon = 'bell',
    color = 'yellow',
    sort_order = 6,
    is_active = true,
    updated_at = NOW()
WHERE name = 'notifications';

UPDATE rbac_modules SET 
    display_name = 'Project Management',
    description = 'Manage projects and initiatives',
    icon = 'Package',
    color = 'teal',
    sort_order = 3,
    is_active = true,
    updated_at = NOW()
WHERE name = 'projects';

UPDATE rbac_modules SET 
    display_name = 'RBAC Management',
    description = 'Role-Based Access Control system for managing user permissions',
    icon = 'Shield',
    color = 'red',
    sort_order = 6,
    is_active = true,
    updated_at = NOW()
WHERE name = 'rbac';

UPDATE rbac_modules SET 
    display_name = 'Users',
    description = 'User management',
    icon = 'Users',
    color = 'purple',
    sort_order = 5,
    is_active = true,
    updated_at = NOW()
WHERE name = 'users';

UPDATE rbac_modules SET 
    display_name = 'Payment Processing',
    description = 'Payment and transaction management',
    icon = 'CreditCard',
    color = 'emerald',
    sort_order = 9,
    is_active = true,
    updated_at = NOW()
WHERE name = 'payments';

UPDATE rbac_modules SET 
    display_name = 'File Management',
    description = 'File upload and document management',
    icon = 'FileText',
    color = 'gray',
    sort_order = 10,
    is_active = true,
    updated_at = NOW()
WHERE name = 'files';

UPDATE rbac_modules SET 
    display_name = 'Reports & Analytics',
    description = 'Data analysis and reporting tools',
    icon = 'BarChart3',
    color = 'indigo',
    sort_order = 7,
    is_active = true,
    updated_at = NOW()
WHERE name = 'reports';

UPDATE rbac_modules SET 
    display_name = 'Profile & Settings',
    description = 'Personal profile and account settings',
    icon = 'User',
    color = 'orange',
    sort_order = 11,
    is_active = true,
    updated_at = NOW()
WHERE name = 'profile';

-- Ensure we have the necessary permissions for menu items
INSERT INTO rbac_permissions (name, display_name, description, resource, action, module_id, category, is_active) VALUES
-- Dashboard permissions
('view:dashboard', 'View Dashboard', 'Access the main dashboard', 'dashboard', 'view', (SELECT id FROM rbac_modules WHERE name = 'dashboard'), 'view', true),
('view:analytics', 'View Analytics', 'View analytics and statistics', 'analytics', 'view', (SELECT id FROM rbac_modules WHERE name = 'dashboard'), 'view', true),

-- Cases permissions
('view:cases', 'View Cases', 'View all donation cases', 'cases', 'view', (SELECT id FROM rbac_modules WHERE name = 'cases'), 'view', true),
('create:cases', 'Create Cases', 'Create new donation cases', 'cases', 'create', (SELECT id FROM rbac_modules WHERE name = 'cases'), 'create', true),
('update:cases', 'Update Cases', 'Update existing cases', 'cases', 'update', (SELECT id FROM rbac_modules WHERE name = 'cases'), 'update', true),
('delete:cases', 'Delete Cases', 'Delete cases', 'cases', 'delete', (SELECT id FROM rbac_modules WHERE name = 'cases'), 'delete', true),

-- Contributions permissions
('view:own_contributions', 'View Own Contributions', 'View own contributions', 'contributions', 'view', (SELECT id FROM rbac_modules WHERE name = 'contributions'), 'view', true),
('create:contributions', 'Create Contributions', 'Make new contributions', 'contributions', 'create', (SELECT id FROM rbac_modules WHERE name = 'contributions'), 'create', true),

-- Beneficiaries permissions
('view:beneficiaries', 'View Beneficiaries', 'View all beneficiaries', 'beneficiaries', 'view', (SELECT id FROM rbac_modules WHERE name = 'beneficiaries'), 'view', true),
('create:beneficiaries', 'Create Beneficiaries', 'Create new beneficiaries', 'beneficiaries', 'create', (SELECT id FROM rbac_modules WHERE name = 'beneficiaries'), 'create', true),
('update:beneficiaries', 'Update Beneficiaries', 'Update existing beneficiaries', 'beneficiaries', 'update', (SELECT id FROM rbac_modules WHERE name = 'beneficiaries'), 'update', true),
('delete:beneficiaries', 'Delete Beneficiaries', 'Delete beneficiaries', 'beneficiaries', 'delete', (SELECT id FROM rbac_modules WHERE name = 'beneficiaries'), 'delete', true),

-- Projects permissions
('view:projects', 'View Projects', 'View all projects', 'projects', 'view', (SELECT id FROM rbac_modules WHERE name = 'projects'), 'view', true),
('create:projects', 'Create Projects', 'Create new projects', 'projects', 'create', (SELECT id FROM rbac_modules WHERE name = 'projects'), 'create', true),
('update:projects', 'Update Projects', 'Update existing projects', 'projects', 'update', (SELECT id FROM rbac_modules WHERE name = 'projects'), 'update', true),
('delete:projects', 'Delete Projects', 'Delete projects', 'projects', 'delete', (SELECT id FROM rbac_modules WHERE name = 'projects'), 'delete', true),

-- Admin permissions
('view:admin_dashboard', 'View Admin Dashboard', 'Access admin dashboard', 'admin', 'view', (SELECT id FROM rbac_modules WHERE name = 'admin'), 'view', true),
('view:admin_cases', 'View Admin Cases', 'View all cases in admin panel', 'admin', 'view', (SELECT id FROM rbac_modules WHERE name = 'admin'), 'view', true),
('view:admin_contributions', 'View Admin Contributions', 'View all contributions in admin panel', 'admin', 'view', (SELECT id FROM rbac_modules WHERE name = 'admin'), 'view', true),

-- RBAC permissions
('view:admin_rbac', 'View RBAC Management', 'Access RBAC management panel', 'rbac', 'view', (SELECT id FROM rbac_modules WHERE name = 'rbac'), 'view', true),
('manage:rbac', 'Manage RBAC', 'Manage roles and permissions', 'rbac', 'manage', (SELECT id FROM rbac_modules WHERE name = 'rbac'), 'manage', true),

-- Users permissions
('view:admin_users', 'View Admin Users', 'View all users in admin panel', 'users', 'view', (SELECT id FROM rbac_modules WHERE name = 'users'), 'view', true),
('create:users', 'Create Users', 'Create new users', 'users', 'create', (SELECT id FROM rbac_modules WHERE name = 'users'), 'create', true),
('update:users', 'Update Users', 'Update existing users', 'users', 'update', (SELECT id FROM rbac_modules WHERE name = 'users'), 'update', true),
('delete:users', 'Delete Users', 'Delete users', 'users', 'delete', (SELECT id FROM rbac_modules WHERE name = 'users'), 'delete', true),

-- Payments permissions
('view:admin_payments', 'View Admin Payments', 'View payment methods in admin panel', 'payments', 'view', (SELECT id FROM rbac_modules WHERE name = 'payments'), 'view', true),
('manage:payments', 'Manage Payments', 'Manage payment methods and settings', 'payments', 'manage', (SELECT id FROM rbac_modules WHERE name = 'payments'), 'manage', true),

-- Files permissions
('view:admin_files', 'View Admin Files', 'View files in admin panel', 'files', 'view', (SELECT id FROM rbac_modules WHERE name = 'files'), 'view', true),
('manage:files', 'Manage Files', 'Manage system files', 'files', 'manage', (SELECT id FROM rbac_modules WHERE name = 'files'), 'manage', true),

-- Reports permissions
('view:admin_reports', 'View Admin Reports', 'View reports and analytics in admin panel', 'reports', 'view', (SELECT id FROM rbac_modules WHERE name = 'reports'), 'view', true),
('manage:reports', 'Manage Reports', 'Manage reports and analytics', 'reports', 'manage', (SELECT id FROM rbac_modules WHERE name = 'reports'), 'manage', true),

-- Profile permissions
('view:profile', 'View Profile', 'View own profile', 'profile', 'view', (SELECT id FROM rbac_modules WHERE name = 'profile'), 'view', true),
('update:profile', 'Update Profile', 'Update own profile', 'profile', 'update', (SELECT id FROM rbac_modules WHERE name = 'profile'), 'update', true),

-- Notifications permissions
('view:notifications', 'View Notifications', 'View system notifications', 'notifications', 'view', (SELECT id FROM rbac_modules WHERE name = 'notifications'), 'view', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    module_id = EXCLUDED.module_id,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO rbac_role_permissions (role_id, permission_id, is_active)
SELECT 
    r.id as role_id,
    p.id as permission_id,
    true as is_active
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Admin gets most permissions except super admin specific ones
INSERT INTO rbac_role_permissions (role_id, permission_id, is_active)
SELECT 
    r.id as role_id,
    p.id as permission_id,
    true as is_active
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'admin'
  AND p.name NOT LIKE 'super_admin:%'
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Moderator gets view and some create permissions
INSERT INTO rbac_role_permissions (role_id, permission_id, is_active)
SELECT 
    r.id as role_id,
    p.id as permission_id,
    true as is_active
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'moderator'
  AND (p.name LIKE 'view:%' OR p.name LIKE 'create:%' OR p.name = 'update:cases')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Donor gets basic permissions
INSERT INTO rbac_role_permissions (role_id, permission_id, is_active)
SELECT 
    r.id as role_id,
    p.id as permission_id,
    true as is_active
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'donor'
  AND p.name IN (
    'view:dashboard',
    'view:cases',
    'view:own_contributions',
    'create:contributions',
    'view:notifications'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rbac_modules_sort_order ON rbac_modules(sort_order);
CREATE INDEX IF NOT EXISTS idx_rbac_modules_is_active ON rbac_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_module_id ON rbac_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_is_active ON rbac_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role_id ON rbac_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_permission_id ON rbac_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user_id ON rbac_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_role_id ON rbac_user_roles(role_id);
