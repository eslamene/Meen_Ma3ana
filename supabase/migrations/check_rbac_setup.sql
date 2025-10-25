-- ============================================
-- CHECK RBAC SETUP - Run this to see current state
-- ============================================

-- 1. Check modules
SELECT 
  'MODULES' as type,
  name,
  display_name,
  order_index
FROM permission_modules
ORDER BY order_index;

-- 2. Check permissions and their modules
SELECT 
  'PERMISSIONS' as type,
  p.name,
  p.display_name,
  pm.name as module_name,
  p.resource,
  p.action
FROM permissions p
LEFT JOIN permission_modules pm ON p.module_id = pm.id
ORDER BY pm.name, p.name;

-- 3. Check roles
SELECT 
  'ROLES' as type,
  r.name,
  r.display_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name;

-- 4. Check user roles
SELECT 
  'USER_ROLES' as type,
  u.email,
  r.name as role_name,
  r.display_name as role_display_name
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email, r.name;

-- 5. Check admin role permissions
SELECT 
  'ADMIN_PERMISSIONS' as type,
  p.name,
  p.display_name,
  pm.name as module_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN permission_modules pm ON p.module_id = pm.id
WHERE r.name IN ('admin', 'super_admin')
ORDER BY pm.name, p.name;

