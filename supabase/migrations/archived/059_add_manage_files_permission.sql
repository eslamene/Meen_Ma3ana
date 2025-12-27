-- =====================================================
-- ADD MANAGE:FILES PERMISSION
-- Permission for managing storage buckets and file uploads
-- =====================================================

BEGIN;

-- Insert the manage:files permission
INSERT INTO admin_permissions (
  name,
  display_name,
  display_name_ar,
  description,
  description_ar,
  resource,
  action,
  is_system,
  is_active
)
VALUES (
  'manage:files',
  'Manage Files',
  'إدارة الملفات',
  'Manage storage buckets, configure upload rules, and handle file operations',
  'إدارة دلاء التخزين وتكوين قواعد الرفع والتعامل مع عمليات الملفات',
  'storage',
  'manage',
  true,
  true
)
ON CONFLICT (name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  display_name_ar = EXCLUDED.display_name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  is_active = true;

-- Assign manage:files permission to admin role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'admin' 
AND p.name = 'manage:files'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign manage:files permission to super_admin role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'super_admin' 
AND p.name = 'manage:files'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if permission was created
SELECT 
  name,
  display_name,
  resource,
  action,
  is_active
FROM admin_permissions
WHERE name = 'manage:files';

-- Check if permission was assigned to admin roles
SELECT 
  r.name as role_name,
  p.name as permission_name,
  p.display_name as permission_display_name
FROM admin_role_permissions rp
JOIN admin_roles r ON rp.role_id = r.id
JOIN admin_permissions p ON rp.permission_id = p.id
WHERE p.name = 'manage:files'
ORDER BY r.name;

