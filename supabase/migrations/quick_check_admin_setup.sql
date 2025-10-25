-- Quick check for admin RBAC setup
-- Run this to see what's in your database

-- 1. Check if modules exist
SELECT 'MODULES CHECK' as check_type, COUNT(*) as count 
FROM permission_modules;

SELECT 'MODULE DETAILS' as info, * FROM permission_modules ORDER BY order_index;

-- 2. Check if permissions exist and are linked to modules
SELECT 'PERMISSIONS CHECK' as check_type, COUNT(*) as count 
FROM permissions;

SELECT 
  'PERMISSIONS BY MODULE' as info,
  pm.name as module_name,
  COUNT(p.id) as permission_count
FROM permission_modules pm
LEFT JOIN permissions p ON p.module_id = pm.id
GROUP BY pm.id, pm.name
ORDER BY pm.order_index;

-- 3. Check admin user and their roles
SELECT 
  'YOUR USER ROLES' as info,
  u.email,
  r.name as role_name,
  r.display_name
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'eslam.ene@gmail.com';

-- 4. Check admin role permissions
SELECT 
  'ADMIN ROLE PERMISSIONS' as info,
  COUNT(rp.id) as total_permissions
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name IN ('admin', 'super_admin')
GROUP BY r.name;

-- 5. Check specific key permissions
SELECT 
  'KEY PERMISSIONS CHECK' as info,
  p.name,
  pm.name as module_name,
  EXISTS(
    SELECT 1 FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE rp.permission_id = p.id 
    AND r.name = 'admin'
  ) as admin_has_it
FROM permissions p
LEFT JOIN permission_modules pm ON p.module_id = pm.id
WHERE p.name IN (
  'view:dashboard',
  'view:cases',
  'create:case',
  'manage:cases',
  'manage:contributions',
  'manage:users',
  'manage:rbac'
)
ORDER BY p.name;

