-- Add contributions:read permission for existing databases
-- This fixes the "Access Denied" error for users trying to view their contributions

-- Add contributions:read permission
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system)
VALUES ('contributions:read', 'Read Contributions', 'قراءة المساهمات', 'Read/view own contributions', 'contributions', 'read', true)
ON CONFLICT (name) DO NOTHING;

-- Assign to donor role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'donor' AND p.name = 'contributions:read'
ON CONFLICT DO NOTHING;

-- Assign to moderator role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'moderator' AND p.name = 'contributions:read'
ON CONFLICT DO NOTHING;

-- Admin and super_admin already have all permissions, so no need to assign explicitly

