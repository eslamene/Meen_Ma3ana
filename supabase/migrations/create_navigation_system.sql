-- Create a fully dynamic navigation system
-- Navigation items are stored in the database and linked to permissions

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create navigation_items table
CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label_key TEXT NOT NULL, -- Translation key
  href TEXT NOT NULL,
  icon TEXT NOT NULL, -- Icon name (lucide-react)
  module_id UUID REFERENCES permission_modules(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE, -- For nested items
  order_index INTEGER DEFAULT 0,
  is_standalone BOOLEAN DEFAULT FALSE, -- Items not in modules (like Profile)
  is_active BOOLEAN DEFAULT TRUE,
  exact_match BOOLEAN DEFAULT FALSE, -- For active state matching
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_navigation_items_module ON navigation_items(module_id);
CREATE INDEX IF NOT EXISTS idx_navigation_items_permission ON navigation_items(permission_id);
CREATE INDEX IF NOT EXISTS idx_navigation_items_parent ON navigation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_navigation_items_order ON navigation_items(order_index);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_navigation_items_updated_at ON navigation_items;
CREATE TRIGGER update_navigation_items_updated_at
  BEFORE UPDATE ON navigation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert navigation items based on existing structure

-- Dashboard Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index, exact_match)
SELECT 
  'dashboard',
  'navigation.overview',
  '/dashboard',
  'BarChart3',
  pm.id,
  p.id,
  1,
  true
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:dashboard'
WHERE pm.name = 'dashboard'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'admin-dashboard',
  'navigation.admin',
  '/admin',
  'ShieldCheck',
  pm.id,
  p.id,
  2
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:dashboard'
WHERE pm.name = 'dashboard'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'analytics',
  'navigation.analytics',
  '/admin/analytics',
  'LineChart',
  pm.id,
  p.id,
  3
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:dashboard'
WHERE pm.name = 'dashboard'
ON CONFLICT (key) DO NOTHING;

-- Cases Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'cases-list',
  'navigation.allCases',
  '/cases',
  'FileText',
  pm.id,
  p.id,
  1
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:cases'
WHERE pm.name = 'cases'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'cases-create',
  'navigation.createCase',
  '/cases/create',
  'FileCheck',
  pm.id,
  p.id,
  2
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'create:case'
WHERE pm.name = 'cases'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'cases-admin',
  'navigation.manageCases',
  '/admin/cases',
  'Settings',
  pm.id,
  p.id,
  3
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:cases'
WHERE pm.name = 'cases'
ON CONFLICT (key) DO NOTHING;

-- Projects Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'projects-list',
  'navigation.allProjects',
  '/projects',
  'FolderKanban',
  pm.id,
  p.id,
  1
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:cases'
WHERE pm.name = 'projects'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'projects-create',
  'navigation.createProject',
  '/projects/create',
  'PlusCircle',
  pm.id,
  p.id,
  2
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'create:case'
WHERE pm.name = 'projects'
ON CONFLICT (key) DO NOTHING;

-- Contributions Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'contributions-my',
  'navigation.myContributions',
  '/contributions',
  'Heart',
  pm.id,
  p.id,
  1
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:own_contributions'
WHERE pm.name = 'contributions'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'contributions-recurring',
  'navigation.recurringContributions',
  '/contributions/recurring',
  'Repeat',
  pm.id,
  p.id,
  2
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:own_contributions'
WHERE pm.name = 'contributions'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'contributions-admin',
  'navigation.allContributions',
  '/admin/contributions',
  'DollarSign',
  pm.id,
  p.id,
  3
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:contributions'
WHERE pm.name = 'contributions'
ON CONFLICT (key) DO NOTHING;

-- Users Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'users-list',
  'navigation.allUsers',
  '/admin/users',
  'Users',
  pm.id,
  p.id,
  1
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:users'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'users-roles-admin',
  'navigation.userRoles',
  '/admin/users/roles',
  'UserCog',
  pm.id,
  p.id,
  2
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:users'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'rbac-main',
  'navigation.rolesPermissions',
  '/admin/rbac',
  'Shield',
  pm.id,
  p.id,
  3
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:rbac'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

-- NEW: Add RBAC sub-pages
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'rbac-permissions',
  'navigation.permissions',
  '/admin/rbac/permissions',
  'ShieldCheck',
  pm.id,
  p.id,
  4
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:rbac'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'rbac-roles',
  'navigation.roles',
  '/admin/rbac/roles',
  'Shield',
  pm.id,
  p.id,
  5
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:rbac'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'rbac-users',
  'navigation.rbacUsers',
  '/admin/rbac/users',
  'UserCog',
  pm.id,
  p.id,
  6
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:rbac'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'rbac-modular',
  'navigation.rbacModular',
  '/admin/rbac-modular',
  'GitBranch',
  pm.id,
  p.id,
  7
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'manage:rbac'
WHERE pm.name = 'users'
ON CONFLICT (key) DO NOTHING;

-- Notifications Module Items
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index)
SELECT 
  'notifications',
  'navigation.notifications',
  '/notifications',
  'Bell',
  pm.id,
  p.id,
  1
FROM permission_modules pm
LEFT JOIN permissions p ON p.name = 'view:notifications'
WHERE pm.name = 'notifications'
ON CONFLICT (key) DO NOTHING;

-- Standalone Items (Profile)
INSERT INTO navigation_items (key, label_key, href, icon, permission_id, order_index, is_standalone)
VALUES 
  ('profile', 'navigation.profile', '/profile', 'UserPlus', NULL, 1, true)
ON CONFLICT (key) DO NOTHING;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

