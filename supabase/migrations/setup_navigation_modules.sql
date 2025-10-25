-- ============================================
-- SETUP NAVIGATION MODULES AND LINK PERMISSIONS
-- ============================================

-- First, add order_index column if it doesn't exist
ALTER TABLE permission_modules 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Then, ensure we have the core modules
INSERT INTO permission_modules (name, display_name, description, icon, order_index)
VALUES 
  ('dashboard', 'Dashboard', 'Dashboard and overview', 'BarChart3', 1),
  ('cases', 'Cases', 'Case management', 'FileText', 2),
  ('contributions', 'Contributions', 'Contribution management', 'Heart', 3),
  ('users', 'Users', 'User management', 'Users', 4),
  ('notifications', 'Notifications', 'Notifications', 'Bell', 5)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index;

-- Get module IDs
DO $$
DECLARE
  dashboard_id UUID;
  cases_id UUID;
  contributions_id UUID;
  users_id UUID;
  notifications_id UUID;
BEGIN
  -- Get module IDs
  SELECT id INTO dashboard_id FROM permission_modules WHERE name = 'dashboard';
  SELECT id INTO cases_id FROM permission_modules WHERE name = 'cases';
  SELECT id INTO contributions_id FROM permission_modules WHERE name = 'contributions';
  SELECT id INTO users_id FROM permission_modules WHERE name = 'users';
  SELECT id INTO notifications_id FROM permission_modules WHERE name = 'notifications';

  -- Update permissions to link to modules
  
  -- Dashboard permissions
  UPDATE permissions SET module_id = dashboard_id
  WHERE name IN ('view:dashboard', 'view:analytics');

  -- Cases permissions
  UPDATE permissions SET module_id = cases_id
  WHERE name LIKE '%case%' OR name LIKE '%:cases';

  -- Contributions permissions
  UPDATE permissions SET module_id = contributions_id
  WHERE name LIKE '%contribution%';

  -- Users permissions
  UPDATE permissions SET module_id = users_id
  WHERE name IN ('manage:users', 'view:users', 'manage:rbac', 'view:rbac');

  -- Notifications permissions
  UPDATE permissions SET module_id = notifications_id
  WHERE name LIKE '%notification%';

END $$;

-- Create missing core permissions if they don't exist
INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:dashboard',
  'View Dashboard',
  'Access to main dashboard',
  'dashboard',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'dashboard')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:dashboard');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:cases',
  'View Cases',
  'View all cases',
  'cases',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'cases')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:cases');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'create:case',
  'Create Case',
  'Create new cases',
  'case',
  'create',
  (SELECT id FROM permission_modules WHERE name = 'cases')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'create:case');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'manage:cases',
  'Manage Cases',
  'Full case management access',
  'cases',
  'manage',
  (SELECT id FROM permission_modules WHERE name = 'cases')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage:cases');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:own_contributions',
  'View Own Contributions',
  'View own contributions',
  'contributions',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'contributions')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:own_contributions');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'manage:contributions',
  'Manage Contributions',
  'Manage all contributions',
  'contributions',
  'manage',
  (SELECT id FROM permission_modules WHERE name = 'contributions')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage:contributions');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'manage:users',
  'Manage Users',
  'Manage users',
  'users',
  'manage',
  (SELECT id FROM permission_modules WHERE name = 'users')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage:users');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'manage:rbac',
  'Manage RBAC',
  'Manage roles and permissions',
  'rbac',
  'manage',
  (SELECT id FROM permission_modules WHERE name = 'users')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage:rbac');

INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:notifications',
  'View Notifications',
  'View notifications',
  'notifications',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'notifications')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:notifications');

-- Assign all permissions to admin and super_admin roles
DO $$
DECLARE
  admin_role_id UUID;
  super_admin_role_id UUID;
  perm RECORD;
BEGIN
  -- Get admin role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';

  -- If admin role exists, assign all permissions
  IF admin_role_id IS NOT NULL THEN
    FOR perm IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;

  -- If super_admin role exists, assign all permissions
  IF super_admin_role_id IS NOT NULL THEN
    FOR perm IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (super_admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

