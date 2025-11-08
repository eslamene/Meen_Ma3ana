# Quick Fix: Add contributions:read Permission

## Problem
Users see "Access Denied" because the dashboard checks for `contributions:read` permission, but it wasn't created or assigned to donor roles.

## Quick Fix (For Existing Databases)

Run this SQL migration:

```bash
# Using Supabase CLI
supabase migration new add_contributions_read_permission

# Then copy the SQL from supabase/migrations/003_add_contributions_read_permission.sql
```

Or run directly:

```sql
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
```

## For New Databases

The main migration (`000_complete_admin_setup.sql`) has been updated to include this permission automatically.

## Verify Fix

After running the migration, verify users have the permission:

```sql
-- Check donor permissions
SELECT r.name as role, p.name as permission
FROM admin_roles r
JOIN admin_role_permissions rp ON r.id = rp.role_id
JOIN admin_permissions p ON rp.permission_id = p.id
WHERE r.name = 'donor' AND p.name LIKE 'contributions:%'
ORDER BY p.name;
```

You should see both `contributions:view` and `contributions:read` for donors.

