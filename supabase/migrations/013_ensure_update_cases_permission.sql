-- =====================================================
-- Ensure cases:update permission for admin roles
-- This migration ensures that admin roles have the cases:update permission
-- This is a safety check to ensure the permission is properly granted
-- =====================================================

-- Ensure cases:update permission exists and is active
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('cases:update', 'Update Cases', 'تحديث الحالات', 'Edit existing cases', 'cases', 'update', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Ensure admin role has cases:update permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin' AND p.name = 'cases:update'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure super_admin role has cases:update permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' AND p.name = 'cases:update'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure moderator role has cases:update permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'moderator' AND p.name = 'cases:update'
ON CONFLICT (role_id, permission_id) DO NOTHING;

