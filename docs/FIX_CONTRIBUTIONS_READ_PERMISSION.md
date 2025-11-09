# Fix Missing Permission: contributions:read

## Problem
Users are seeing "Access Denied" because the dashboard checks for `contributions:read` permission, but the migration only creates `contributions:view` and assigns it to donors.

## Solution
Added `contributions:read` permission to the migration and assigned it to donors and moderators.

## Changes Made

### 1. Added `contributions:read` Permission
```sql
('contributions:read', 'Read Contributions', 'قراءة المساهمات', 'Read/view own contributions', 'contributions', 'read', true),
```

### 2. Assigned to Donor Role
Added `contributions:read` to donor permissions list.

### 3. Assigned to Moderator Role  
Added `contributions:read` to moderator permissions list.

## Next Steps

1. **Apply the migration update:**
   ```bash
   # If using Supabase CLI locally
   supabase db reset
   
   # Or apply the updated migration manually
   psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/000_complete_admin_setup.sql
   ```

2. **Or create a new migration** to add the permission:
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

3. **Verify existing users have the permission:**
   ```sql
   -- Check if donors have contributions:read
   SELECT r.name, p.name
   FROM admin_roles r
   JOIN admin_role_permissions rp ON r.id = rp.role_id
   JOIN admin_permissions p ON rp.permission_id = p.id
   WHERE r.name = 'donor' AND p.name LIKE 'contributions:%';
   ```

## Alternative Solution

If you prefer to keep only `contributions:view`, you can update the dashboard to check for `contributions:view` instead of `contributions:read`:

```typescript
// In src/app/[locale]/dashboard/page.tsx
<PermissionGuard permissions={["contributions:view"]}>
```

However, adding `contributions:read` is recommended as it follows REST conventions better (read vs view).

