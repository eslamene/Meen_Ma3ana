# Clean Administration System - Summary

## What We Built

A clean, simple administration system to replace the messy RBAC system. The new system is:

- **Simple**: Easy to understand and maintain
- **Clean**: No legacy code or confusing patterns
- **Role-based**: Users have roles, roles have permissions
- **Menu-driven**: Menu items automatically filter based on permissions
- **Bilingual**: Supports Arabic and English

## New Database Schema

### Tables Created

1. **admin_roles** - User roles (visitor, donor, moderator, admin, super_admin)
2. **admin_permissions** - System permissions (cases:create, admin:dashboard, etc.)
3. **admin_role_permissions** - Links roles to permissions
4. **admin_user_roles** - Assigns roles to users
5. **admin_menu_items** - Menu items with permission-based access

### Key Features

- Role hierarchy (level 0-4)
- Permission-based menu filtering
- RLS policies for security
- Helper functions for permission checks
- Bilingual support (English/Arabic)

## New Code Structure

### Services

- `src/lib/admin/service.ts` - Server-side admin service
- `src/lib/admin/hooks.ts` - Client-side React hook (`useAdmin`)
- `src/lib/admin/types.ts` - TypeScript type definitions

### API Routes

- `GET /api/admin/roles` - Get all roles
- `POST /api/admin/roles` - Create role (super_admin only)
- `GET /api/admin/permissions` - Get all permissions
- `GET /api/admin/menu` - Get user's menu items
- `GET /api/admin/users/[userId]/roles` - Get user's roles
- `POST /api/admin/users/[userId]/roles` - Assign role to user

### Components

- `src/components/admin/AdminMenu.tsx` - Menu component

## Next Steps

### 1. Apply Database Migration

Run the migration file:

```bash
# Using Supabase CLI
supabase db push

# Or manually
psql -U postgres -d your_database -f supabase/migrations/001_create_clean_admin_system.sql
```

### 2. Test the New System

1. Test role assignment
2. Test permission checks
3. Test menu filtering
4. Verify API routes work

### 3. Migrate Existing Users (Optional)

If you have existing users, assign them default roles:

```sql
-- Assign 'donor' role to all users
INSERT INTO admin_user_roles (user_id, role_id, is_active)
SELECT u.id, r.id, true
FROM auth.users u
CROSS JOIN admin_roles r
WHERE r.name = 'donor'
ON CONFLICT DO NOTHING;
```

### 4. Update Components

Replace old RBAC hooks with new `useAdmin` hook:

```typescript
// Old
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'

// New
import { useAdmin } from '@/lib/admin/hooks'
```

### 5. Remove Old RBAC Code

After testing, remove:
- `src/lib/rbac/` directory
- `src/lib/hooks/useSimpleRBAC.ts`
- `src/lib/hooks/useDatabasePermissions.ts`
- `src/app/api/admin/rbac/` directory
- Old RBAC migrations

## Usage Examples

### Check Permission

```typescript
import { useAdmin } from '@/lib/admin/hooks'

function MyComponent() {
  const { hasPermission } = useAdmin()
  
  if (hasPermission('cases:create')) {
    return <button>Create Case</button>
  }
}
```

### Check Role

```typescript
const { hasRole } = useAdmin()

if (hasRole('admin')) {
  // Show admin features
}
```

### Display Menu

```typescript
import { AdminMenu } from '@/components/admin/AdminMenu'

function Sidebar() {
  return <AdminMenu />
}
```

### Server-Side Check

```typescript
import { adminService } from '@/lib/admin/service'

const hasPermission = await adminService.hasPermission(userId, 'cases:create')
```

## Default Setup

The migration creates:

- **5 default roles**: visitor, donor, moderator, admin, super_admin
- **17 default permissions**: covering dashboard, cases, contributions, admin, profile
- **Default menu items**: Dashboard, Cases, Contributions, Admin, Profile
- **Role-permission assignments**: Donor, Moderator, Admin, Super Admin have appropriate permissions

## Benefits

✅ **Simple**: Easy to understand and maintain  
✅ **Clean**: No legacy code or confusing patterns  
✅ **Flexible**: Easy to add new roles and permissions  
✅ **Secure**: RLS policies protect data  
✅ **Performant**: Database functions for efficient queries  
✅ **Bilingual**: Supports Arabic and English  
✅ **Menu-driven**: Automatic menu filtering based on permissions  

## Support

For questions or issues, refer to:
- `docs/ADMIN_SYSTEM_MIGRATION.md` - Detailed migration guide
- `supabase/migrations/001_create_clean_admin_system.sql` - Database schema
- `src/lib/admin/` - Service and hook implementations

