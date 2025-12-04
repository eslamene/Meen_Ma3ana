# Clean Administration System Migration Guide

## Overview

This guide explains how to migrate from the old RBAC system to the new clean administration system.

## What Changed

### New Clean System

1. **Simplified Database Schema**
   - `admin_roles` - User roles (visitor, donor, moderator, admin, super_admin)
   - `admin_permissions` - System permissions (cases:create, admin:dashboard, etc.)
   - `admin_role_permissions` - Role-permission assignments
   - `admin_user_roles` - User-role assignments
   - `admin_menu_items` - Menu items with permission-based access

2. **New Service Layer**
   - `src/lib/admin/service.ts` - Server-side admin service
   - `src/lib/admin/hooks.ts` - Client-side React hook
   - `src/lib/admin/types.ts` - TypeScript type definitions

3. **New API Routes**
   - `/api/admin/roles` - Manage roles
   - `/api/admin/permissions` - Manage permissions
   - `/api/admin/menu` - Get user menu items
   - `/api/admin/users/[userId]/roles` - Manage user roles

4. **New Components**
   - `src/components/admin/AdminMenu.tsx` - Menu component using new system

## Migration Steps

### Step 1: Run Database Migration

Run the new migration file:

```bash
# Apply the migration
psql -U postgres -d your_database -f supabase/migrations/001_create_clean_admin_system.sql
```

Or if using Supabase CLI:

```bash
supabase db push
```

### Step 2: Migrate Existing Data (Optional)

If you have existing users with roles, you can migrate them using this script:

```sql
-- Migrate existing user roles from old system to new system
-- This assumes you have users in auth.users and want to assign default roles

-- Assign 'donor' role to all existing users (adjust as needed)
INSERT INTO admin_user_roles (user_id, role_id, is_active)
SELECT 
    u.id,
    r.id,
    true
FROM auth.users u
CROSS JOIN admin_roles r
WHERE r.name = 'donor'
AND NOT EXISTS (
    SELECT 1 FROM admin_user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- If you have admin users, assign admin role
-- UPDATE admin_user_roles SET role_id = (SELECT id FROM admin_roles WHERE name = 'admin')
-- WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%admin%');
```

### Step 3: Update Code

1. **Replace old RBAC hooks with new admin hook:**

```typescript
// Old
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'

// New
import { useAdmin } from '@/lib/admin/hooks'

function MyComponent() {
  const { hasPermission, hasRole, menuItems } = useAdmin()
  // ...
}
```

2. **Replace old permission checks:**

```typescript
// Old
import { useDatabasePermissions } from '@/lib/hooks/useDatabasePermissions'
const { hasPermission } = useDatabasePermissions()

// New
import { useAdmin } from '@/lib/admin/hooks'
const { hasPermission } = useAdmin()
```

3. **Update menu components:**

```typescript
// Old
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'

// New
import { AdminMenu } from '@/components/admin/AdminMenu'

function Layout() {
  return <AdminMenu />
}
```

### Step 4: Remove Old RBAC Code

After migration is complete, you can remove:

1. **Old RBAC files:**
   - `src/lib/rbac/` directory
   - `src/lib/hooks/useSimpleRBAC.ts`
   - `src/lib/hooks/useDatabasePermissions.ts`
   - `src/lib/hooks/usePermissions.ts`
   - `src/lib/server/menu.ts` (old menu system)

2. **Old RBAC API routes:**
   - `src/app/api/admin/rbac/` directory

3. **Old RBAC components:**
   - `src/components/admin/rbac/` directory
   - `src/components/auth/PermissionGuard.tsx` (if using old system)

4. **Old RBAC migrations:**
   - `supabase/migrations/step1_create_rbac_tables.sql`
   - `supabase/migrations/step2_migrate_data.sql`
   - Other old RBAC migration files

## New System Usage

### Checking Permissions

```typescript
import { useAdmin } from '@/lib/admin/hooks'

function MyComponent() {
  const { hasPermission, hasRole, hasAnyRole, hasAnyPermission } = useAdmin()

  if (hasPermission('cases:create')) {
    // Show create button
  }

  if (hasRole('admin')) {
    // Show admin features
  }

  if (hasAnyRole(['admin', 'moderator'])) {
    // Show moderator/admin features
  }
}
```

### Server-Side Permission Checks

```typescript
import { adminService } from '@/lib/admin/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasPermission = await adminService.hasPermission(user.id, 'cases:create')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Continue with request
}
```

### Menu System

The menu system automatically filters items based on user permissions:

```typescript
import { AdminMenu } from '@/components/admin/AdminMenu'

function Sidebar() {
  return (
    <div>
      <AdminMenu />
    </div>
  )
}
```

## Default Roles and Permissions

### Roles

- **visitor** (level 0) - Unauthenticated users
- **donor** (level 1) - Can make contributions
- **moderator** (level 2) - Can moderate content
- **admin** (level 3) - Full system access
- **super_admin** (level 4) - System management

### Default Permissions

- `dashboard:view` - View dashboard
- `dashboard:analytics` - View analytics
- `cases:view` - View cases
- `cases:create` - Create cases
- `cases:update` - Update cases
- `cases:delete` - Delete cases
- `cases:manage` - Full case management
- `contributions:view` - View contributions
- `contributions:create` - Create contributions
- `contributions:approve` - Approve contributions
- `contributions:manage` - Full contribution management
- `admin:dashboard` - Access admin dashboard
- `admin:users` - Manage users
- `admin:roles` - Manage roles
- `admin:settings` - System settings
- `admin:analytics` - View admin analytics
- `profile:view` - View profile
- `profile:update` - Update profile

## Adding New Permissions

To add a new permission:

```sql
INSERT INTO admin_permissions (name, display_name, resource, action, is_system)
VALUES ('reports:view', 'View Reports', 'reports', 'view', true);
```

Then assign it to roles:

```sql
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'admin' AND p.name = 'reports:view';
```

## Adding Menu Items

To add a new menu item:

```sql
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id)
VALUES (
  'Reports',
  'التقارير',
  '/admin/reports',
  'FileText',
  'View reports',
  15,
  (SELECT id FROM admin_permissions WHERE name = 'reports:view')
);
```

## Troubleshooting

### Menu items not showing

1. Check if user has the required permission
2. Verify menu item `is_active = true`
3. Check permission `is_active = true`
4. Verify user has active role assignment

### Permission checks failing

1. Verify user has active role assignment
2. Check role has the permission assigned
3. Verify both role and permission are active
4. Check RLS policies allow access

## Next Steps

1. Test the new system thoroughly
2. Update all components to use new hooks
3. Remove old RBAC code
4. Update documentation
5. Train team on new system

