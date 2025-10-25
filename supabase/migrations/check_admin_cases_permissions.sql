-- Check if admin cases page permissions exist and are assigned
-- This script will verify and fix permissions for /admin/cases page

-- 1. Check if required permissions exist
SELECT 'Checking permissions...' as status;

SELECT 
  p.name as permission_name,
  p.display_name,
  CASE WHEN p.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
  ('cases:update'),
  ('cases:delete'),
  ('admin:dashboard')
) AS required_perms(perm_name)
LEFT JOIN permissions p ON p.name = required_perms.perm_name;

-- 2. Check if admin role has these permissions
SELECT 'Checking admin role permissions...' as status;

SELECT 
  r.name as role_name,
  p.name as permission_name,
  CASE WHEN rp.permission_id IS NOT NULL THEN 'ASSIGNED' ELSE 'NOT ASSIGNED' END as status
FROM roles r
CROSS JOIN permissions p
LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.name = 'admin' 
  AND p.name IN ('cases:update', 'cases:delete', 'admin:dashboard')
ORDER BY p.name;

-- 3. Check if cases module exists
SELECT 'Checking cases module...' as status;

SELECT 
  pm.name as module_name,
  pm.display_name,
  pm.icon,
  pm.sort_order,
  CASE WHEN pm.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM permission_modules pm
WHERE pm.name = 'cases';

-- 4. Check navigation items for cases module
SELECT 'Checking navigation items...' as status;

SELECT 
  ni.key,
  ni.label_key,
  ni.href,
  ni.icon,
  ni.order_index,
  p.name as required_permission
FROM navigation_items ni
LEFT JOIN permissions p ON p.id = ni.permission_id
WHERE ni.href = '/admin/cases';

-- 5. If permissions are missing, create them
INSERT INTO permissions (name, display_name, description, resource, action, created_at, updated_at)
SELECT 
  'cases:update',
  'Update Cases',
  'Permission to update existing cases',
  'cases',
  'update',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cases:update');

INSERT INTO permissions (name, display_name, description, resource, action, created_at, updated_at)
SELECT 
  'cases:delete',
  'Delete Cases',
  'Permission to delete cases',
  'cases',
  'delete',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cases:delete');

-- 6. Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN ('cases:update', 'cases:delete')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 7. Create cases module if it doesn't exist
INSERT INTO permission_modules (name, display_name, description, icon, sort_order, created_at, updated_at)
SELECT 
  'cases',
  'Cases Management',
  'Manage charity cases and campaigns',
  'FolderOpen',
  3,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permission_modules WHERE name = 'cases');

-- 8. Create navigation item for admin cases if it doesn't exist
INSERT INTO navigation_items (key, label_key, href, icon, module_id, permission_id, order_index, created_at)
SELECT 
  'admin-cases',
  'navigation.allCases',
  '/admin/cases',
  'FolderOpen',
  pm.id,
  p.id,
  1,
  NOW()
FROM permission_modules pm
CROSS JOIN permissions p
WHERE pm.name = 'cases'
  AND p.name = 'cases:update'
  AND NOT EXISTS (SELECT 1 FROM navigation_items WHERE href = '/admin/cases');

-- 9. Final verification
SELECT 'Final verification...' as status;

SELECT 
  ni.key,
  ni.label_key,
  ni.href,
  ni.icon,
  p.name as required_permission,
  'READY' as status
FROM navigation_items ni
LEFT JOIN permissions p ON p.id = ni.permission_id
WHERE ni.href = '/admin/cases';
