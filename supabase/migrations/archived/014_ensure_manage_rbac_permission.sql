-- =====================================================
-- Ensure manage:rbac permission for admin roles
-- This migration ensures that admin roles have the manage:rbac permission
-- Required for accessing RBAC management pages (/admin/access-control/*)
-- =====================================================

-- Ensure manage:rbac permission exists and is active
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('manage:rbac', 'Manage RBAC', 'إدارة RBAC', 'Manage roles, permissions, and user assignments', 'rbac', 'manage', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Ensure admin role has manage:rbac permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin' AND p.name = 'manage:rbac'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure super_admin role has manage:rbac permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' AND p.name = 'manage:rbac'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure moderator role has manage:rbac permission (if moderators should have RBAC access)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'moderator' AND p.name = 'manage:rbac'
ON CONFLICT (role_id, permission_id) DO NOTHING;

