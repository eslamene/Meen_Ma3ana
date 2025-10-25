-- Add missing permissions that navigation expects

-- view:own_contributions (for donor's contribution page)
INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:own_contributions',
  'View Own Contributions',
  'View own contributions',
  'contributions',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'contributions')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:own_contributions');

-- view:notifications
INSERT INTO permissions (name, display_name, description, resource, action, module_id)
SELECT 
  'view:notifications',
  'View Notifications',
  'View notifications',
  'notifications',
  'view',
  (SELECT id FROM permission_modules WHERE name = 'notifications')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view:notifications');

-- Assign these to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('admin', 'super_admin')
AND p.name IN ('view:own_contributions', 'view:notifications')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

