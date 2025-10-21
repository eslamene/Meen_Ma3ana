-- Migration: Add Visitor Role and Permissions
-- Description: Creates a visitor/guest role for unauthenticated users with limited permissions

-- Create visitor role
INSERT INTO roles (id, name, display_name, description, is_system, created_at, updated_at) VALUES
(
  gen_random_uuid(),
  'visitor',
  'Visitor',
  'Unauthenticated user with limited read-only access to public content',
  true,
  now(),
  now()
);

-- Create visitor-specific permissions
INSERT INTO permissions (id, name, display_name, description, resource, action, module_id, created_at, updated_at) VALUES
-- Public case viewing
(
  gen_random_uuid(),
  'cases:view_public',
  'View Public Cases',
  'View published cases that are marked as public',
  'cases',
  'view_public',
  (SELECT id FROM permission_modules WHERE name = 'cases'),
  now(),
  now()
),
-- Public content access
(
  gen_random_uuid(),
  'content:view_public',
  'View Public Content',
  'Access public pages and content without authentication',
  'content',
  'view_public',
  (SELECT id FROM permission_modules WHERE name = 'cases'), -- Using cases module for now
  now(),
  now()
),
-- View public statistics
(
  gen_random_uuid(),
  'stats:view_public',
  'View Public Statistics',
  'View general platform statistics and metrics',
  'stats',
  'view_public',
  (SELECT id FROM permission_modules WHERE name = 'reports'),
  now(),
  now()
);

-- Assign visitor permissions to visitor role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  now() as created_at,
  now() as updated_at
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'visitor'
AND p.name IN (
  'cases:view_public',
  'content:view_public', 
  'stats:view_public'
);

-- Add comment for documentation
COMMENT ON TABLE roles IS 'User roles including visitor role for unauthenticated users';
COMMENT ON COLUMN roles.is_system IS 'System roles like visitor cannot be deleted by users';
