-- =====================================================
-- Ensure admin:analytics permission exists and is assigned
-- This migration ensures that the admin:analytics permission exists
-- and is assigned to admin and moderator roles
-- =====================================================

-- Ensure admin:analytics permission exists
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('admin:analytics', 'View Analytics', 'عرض التحليلات', 'View admin analytics and reports', 'admin', 'analytics', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Ensure admin role has admin:analytics permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin' AND p.name = 'admin:analytics'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure super_admin role has admin:analytics permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' AND p.name = 'admin:analytics'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure moderator role has admin:analytics permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'moderator' AND p.name = 'admin:analytics'
ON CONFLICT (role_id, permission_id) DO NOTHING;

