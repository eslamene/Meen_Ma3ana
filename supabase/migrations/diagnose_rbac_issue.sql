-- Diagnose RBAC Issues
-- Run this to check if the RBAC system is properly set up

-- 1. Check if modules exist
SELECT 'Modules' as check_type, count(*) as count FROM permission_modules;

-- 2. Check if permissions exist
SELECT 'Permissions' as check_type, count(*) as count FROM permissions;

-- 3. Check if roles exist
SELECT 'Roles' as check_type, count(*) as count FROM roles;

-- 4. Check if user_roles exist
SELECT 'User Roles' as check_type, count(*) as count FROM user_roles;

-- 5. Check if role_permissions exist
SELECT 'Role Permissions' as check_type, count(*) as count FROM role_permissions;

-- 6. Show all modules
SELECT 'All Modules' as check_type, name, display_name, sort_order FROM permission_modules ORDER BY sort_order;

-- 7. Show all roles
SELECT 'All Roles' as check_type, name, display_name FROM roles;

-- 8. Show permissions for beneficiaries module
SELECT 'Beneficiaries Permissions' as check_type, p.name, p.display_name, p.resource, p.action
FROM permissions p
JOIN permission_modules pm ON p.module_id = pm.id
WHERE pm.name = 'beneficiaries';

-- 9. Show role permissions for admin role
SELECT 'Admin Role Permissions' as check_type, p.name, p.display_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.name;

-- 10. Show user roles for a specific user (replace with actual user ID)
SELECT 'User Roles' as check_type, r.name as role_name, r.display_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
-- WHERE ur.user_id = 'YOUR_USER_ID_HERE'  -- Uncomment and replace with actual user ID
ORDER BY r.name;
