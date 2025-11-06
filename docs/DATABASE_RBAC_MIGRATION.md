# Database RBAC Migration Guide

## Overview

This guide explains how to migrate from the hybrid RBAC system (hardcoded + database) to a fully database-driven RBAC system using your existing `rbac_` tables.

## What Was Changed

### ✅ **New Database-Driven System**

1. **`src/lib/rbac/database-permissions.ts`** - New database RBAC service
2. **`src/lib/hooks/useDatabasePermissions.ts`** - New database-driven permissions hook
3. **Updated `src/lib/hooks/useSimpleRBAC.ts`** - Now uses database RBAC service
4. **Updated `src/lib/hooks/usePermissions.ts`** - Now uses database permissions
5. **Updated `src/components/auth/PermissionGuard.tsx`** - Now uses database permissions

### 🔄 **Migration Benefits**

- **Single Source of Truth**: All permissions stored in database
- **Dynamic Permissions**: Change permissions without code changes
- **Better Performance**: Cached permission lookups
- **Consistency**: No more sync issues between hardcoded and database permissions
- **Flexibility**: Easy to add new roles and permissions

## Database Schema Used

Your existing `rbac_` tables are now fully utilized:

```sql
-- Core RBAC tables
rbac_roles              -- User roles (admin, moderator, etc.)
rbac_permissions        -- Individual permissions (cases:create, etc.)
rbac_role_permissions   -- Role-permission assignments
rbac_user_roles         -- User-role assignments
rbac_modules            -- Permission modules (cases, admin, etc.)

-- Audit tables
rbac_audit_log          -- Permission change logs
rbac_role_assignment_audit -- Role assignment logs
rbac_permission_change_audit -- Permission change logs
```

## How to Use the New System

### 1. **Basic Permission Checking**

```typescript
import { useDatabasePermissions } from '@/lib/hooks/useDatabasePermissions'

function MyComponent() {
  const { hasPermission, hasRole, loading } = useDatabasePermissions()
  
  if (loading) return <div>Loading...</div>
  
  if (hasPermission('cases:create')) {
    return <CreateCaseButton />
  }
  
  if (hasRole('admin')) {
    return <AdminPanel />
  }
  
  return <div>Access denied</div>
}
```

### 2. **Using PermissionGuard (No Changes Required)**

```typescript
import PermissionGuard from '@/components/auth/PermissionGuard'

// This still works exactly the same
<PermissionGuard permission="cases:create">
  <CreateCaseButton />
</PermissionGuard>

<PermissionGuard roles={['admin', 'moderator']}>
  <AdminPanel />
</PermissionGuard>
```

### 3. **Using usePermissions Hook (Backward Compatible)**

```typescript
import { usePermissions } from '@/lib/hooks/usePermissions'

function MyComponent() {
  const { 
    canCreateCase, 
    canAccessAdminDashboard, 
    hasPermission 
  } = usePermissions()
  
  // All existing code continues to work
  if (canCreateCase) {
    return <CreateCaseButton />
  }
}
```

## Database Setup

### 1. **Ensure Your Database Has the Required Data**

Make sure your `rbac_` tables are populated with:

- **Roles**: admin, moderator, sponsor, volunteer, donor
- **Permissions**: cases:create, cases:read, admin:dashboard, etc.
- **Modules**: cases, admin, contributions, etc.
- **Role-Permission Assignments**: Link roles to their permissions
- **User-Role Assignments**: Assign users to roles

### 2. **Check Your Migration Scripts**

Your existing migration scripts should have created the necessary data. If not, you can run:

```bash
# Check if RBAC data exists
npm run check-rbac-data

# Or manually populate if needed
npm run seed-rbac-data
```

## Migration Steps

### ✅ **Step 1: New System is Ready**
- Database RBAC service created
- New hooks implemented
- Existing components updated

### 🔄 **Step 2: Test the New System**
1. Start your application
2. Test permission checking with different user roles
3. Verify admin RBAC management screens work
4. Check that navigation filtering works correctly

### 🗑️ **Step 3: Remove Hardcoded RBAC (Optional)**
Once you're confident the new system works, you can remove:

- `src/lib/rbac/permissions.ts` (hardcoded permissions)
- `src/config/permissions.ts` (hardcoded config)
- Any other hardcoded permission files

## Troubleshooting

### **Permission Not Working?**
1. Check if the permission exists in `rbac_permissions` table
2. Verify the user has a role assigned in `rbac_user_roles`
3. Ensure the role has the permission in `rbac_role_permissions`
4. Check the browser console for any errors

### **Performance Issues?**
The new system includes caching (5-minute cache). If you need to refresh permissions:

```typescript
const { refreshPermissions, clearCache } = useDatabasePermissions()

// Refresh permissions
await refreshPermissions()

// Clear cache and refresh
clearCache()
```

### **Migration Issues?**
If you encounter issues:

1. **Rollback**: The old system is still available, just change imports back
2. **Debug**: Check browser console and network tab for errors
3. **Database**: Verify your RBAC tables have the correct data

## Next Steps

1. **Test thoroughly** with different user roles
2. **Monitor performance** and adjust cache settings if needed
3. **Consider removing** hardcoded RBAC files once confident
4. **Update documentation** to reflect the new system

## Benefits Achieved

✅ **Single Source of Truth**: All permissions in database  
✅ **Dynamic Management**: Change permissions via admin UI  
✅ **Better Performance**: Cached lookups  
✅ **Consistency**: No more sync issues  
✅ **Flexibility**: Easy to add new roles/permissions  
✅ **Backward Compatibility**: Existing code still works  

Your RBAC system is now fully database-driven and much more flexible! 🎉
