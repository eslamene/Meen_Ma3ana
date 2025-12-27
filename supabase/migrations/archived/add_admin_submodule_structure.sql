-- Migration: Add hierarchical admin submodule structure
-- Description: Restructures the admin module to support hierarchical sub-modules
-- Date: 2024-01-XX
-- Author: RBAC System Update

-- Add parent_module_id column to support hierarchical module structure
ALTER TABLE rbac_modules 
ADD COLUMN parent_module_id UUID REFERENCES rbac_modules(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_rbac_modules_parent_module_id ON rbac_modules(parent_module_id);

-- Update existing admin module to be a parent module
UPDATE rbac_modules 
SET parent_module_id = NULL 
WHERE name = 'admin';

-- Create admin sub-modules
INSERT INTO rbac_modules (id, name, display_name, description, icon, color, sort_order, parent_module_id) VALUES
-- Admin RBAC sub-module
(gen_random_uuid(), 'admin_rbac', 'RBAC Management', 'Manage roles, permissions, and user access', 'Shield', '#8B5CF6', 1, 
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1)),

-- Admin Users sub-module  
(gen_random_uuid(), 'admin_users', 'User Management', 'Manage user accounts and roles', 'Users', '#10B981', 2,
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1)),

-- Admin Cases sub-module
(gen_random_uuid(), 'admin_cases', 'Case Management', 'Manage all donation cases', 'Heart', '#EF4444', 3,
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1)),

-- Admin Contributions sub-module
(gen_random_uuid(), 'admin_contributions', 'Contribution Management', 'Manage all contributions', 'CreditCard', '#F59E0B', 4,
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1)),

-- Admin Analytics sub-module
(gen_random_uuid(), 'admin_analytics', 'Analytics & Reports', 'View reports and analytics', 'BarChart3', '#3B82F6', 5,
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1)),

-- Admin Settings sub-module
(gen_random_uuid(), 'admin_settings', 'System Settings', 'Configure system settings', 'Settings', '#6B7280', 6,
 (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1));

-- Update existing permissions to reference the correct sub-module IDs
-- RBAC permissions should reference admin_rbac sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_rbac' LIMIT 1)
WHERE name IN (
  'view:admin_rbac',
  'manage:rbac',
  'view:admin_permissions',
  'view:admin_roles'
);

-- User management permissions should reference admin_users sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_users' LIMIT 1)
WHERE name IN (
  'view:admin_users',
  'manage:users'
);

-- Case management permissions should reference admin_cases sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_cases' LIMIT 1)
WHERE name IN (
  'view:admin_cases',
  'manage:cases'
);

-- Contribution management permissions should reference admin_contributions sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_contributions' LIMIT 1)
WHERE name IN (
  'view:admin_contributions',
  'manage:contributions'
);

-- Analytics permissions should reference admin_analytics sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_analytics' LIMIT 1)
WHERE name IN (
  'view:analytics',
  'view:admin_dashboard'
);

-- Settings permissions should reference admin_settings sub-module
UPDATE rbac_permissions 
SET module_id = (SELECT id FROM rbac_modules WHERE name = 'admin_settings' LIMIT 1)
WHERE name IN (
  'view:admin_settings',
  'manage:settings'
);

-- Add new permissions for file management
INSERT INTO rbac_permissions (id, name, display_name, description, resource, action, module_id, is_system) VALUES
(gen_random_uuid(), 'manage:files', 'Manage Files', 'Upload and manage system files', 'files', 'manage', 
 (SELECT id FROM rbac_modules WHERE name = 'admin_settings' LIMIT 1), true);

-- Add new permissions for system administration
INSERT INTO rbac_permissions (id, name, display_name, description, resource, action, module_id, is_system) VALUES
(gen_random_uuid(), 'admin:system', 'System Administration', 'Access system administration functions', 'system', 'admin', 
 (SELECT id FROM rbac_modules WHERE name = 'admin_settings' LIMIT 1), true);

-- Ensure admin role has all the new permissions
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE r.name = 'admin' 
  AND p.name IN (
    'view:admin_rbac',
    'manage:rbac', 
    'view:admin_users',
    'manage:users',
    'view:admin_cases',
    'manage:cases',
    'view:admin_contributions', 
    'manage:contributions',
    'view:analytics',
    'view:admin_dashboard',
    'view:admin_settings',
    'manage:settings',
    'manage:files',
    'admin:system'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN rbac_modules.parent_module_id IS 'References parent module for hierarchical structure. NULL for top-level modules.';
COMMENT ON INDEX idx_rbac_modules_parent_module_id IS 'Index for efficient querying of child modules by parent';

-- Verify the migration
DO $$
DECLARE
  admin_module_count INTEGER;
  submodule_count INTEGER;
  permission_count INTEGER;
BEGIN
  -- Count admin modules
  SELECT COUNT(*) INTO admin_module_count FROM rbac_modules WHERE name = 'admin';
  
  -- Count admin sub-modules
  SELECT COUNT(*) INTO submodule_count FROM rbac_modules WHERE parent_module_id = (
    SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1
  );
  
  -- Count permissions in admin sub-modules
  SELECT COUNT(*) INTO permission_count FROM rbac_permissions p
  JOIN rbac_modules m ON p.module_id = m.id
  WHERE m.parent_module_id = (SELECT id FROM rbac_modules WHERE name = 'admin' LIMIT 1);
  
  RAISE NOTICE 'Migration completed successfully:';
  RAISE NOTICE '- Admin modules: %', admin_module_count;
  RAISE NOTICE '- Admin sub-modules: %', submodule_count;
  RAISE NOTICE '- Permissions in admin sub-modules: %', permission_count;
END $$;
