# Fix JSON Parsing Error: Missing API Routes

## Problem
The error "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" occurs because code is trying to fetch from old RBAC routes (`/api/admin/rbac/*`) that don't exist. Next.js returns a 404 HTML page instead of JSON.

## Routes Updated ✅

1. ✅ `/api/admin/rbac/users` → `/api/admin/users`
2. ✅ `/api/admin/rbac/roles` → `/api/admin/roles`
3. ✅ `/api/admin/rbac/permissions` → `/api/admin/permissions`

## Routes Still Need Updates ⚠️

### 1. Role Management Routes
**File:** `src/app/[locale]/admin/access-control/roles/page.tsx`

- ❌ `PUT /api/admin/rbac/roles/${id}` - Update role
- ❌ `DELETE /api/admin/rbac/roles/${id}` - Delete role  
- ❌ `GET /api/admin/rbac/roles/${id}/permissions` - Get role permissions
- ❌ `POST /api/admin/rbac/roles/${id}/permissions` - Update role permissions

**Solution Options:**
- Option A: Add these routes to `/api/admin/roles/[id]/route.ts`
- Option B: Use `/api/admin/role-permissions` with query params
- Option C: Update UI to use existing routes differently

### 2. Permission Management Routes
**File:** `src/app/[locale]/admin/access-control/permissions/page.tsx`

- ❌ `POST /api/admin/rbac/permissions` - Create permission
- ❌ `PUT /api/admin/rbac/permissions/${id}` - Update permission
- ❌ `DELETE /api/admin/rbac/permissions/${id}` - Delete permission

**Note:** The new admin system treats permissions as system-defined. Consider if these CRUD operations are needed.

### 3. Modules Routes
**File:** `src/app/[locale]/admin/access-control/modules/page.tsx`

- ❌ `GET /api/admin/rbac/modules` - Get modules
- ❌ `GET /api/admin/rbac/modules/${id}` - Get module
- ❌ `POST /api/admin/rbac/modules` - Create module
- ❌ `PUT /api/admin/rbac/modules/${id}` - Update module
- ❌ `DELETE /api/admin/rbac/modules/${id}` - Delete module

**Note:** The new system groups permissions by `resource` field, not separate modules. This page may need significant refactoring.

## Quick Fix: Add Error Handling

I've added error handling to prevent JSON parsing errors. The code now checks content-type before parsing JSON:

```typescript
const contentType = response.headers.get('content-type')
if (contentType?.includes('application/json')) {
  const data = await response.json()
} else {
  console.error('Non-JSON response:', response.status)
}
```

## Next Steps

1. **Immediate:** The error handling prevents crashes, but functionality is broken
2. **Short-term:** Create missing API routes or update UI to use existing routes
3. **Long-term:** Refactor admin pages to match new admin system architecture

## Recommended Approach

Since the new admin system has a different structure, consider:

1. **Disable broken features temporarily** - Comment out fetch calls that use non-existent routes
2. **Create minimal routes** - Add only essential routes needed for basic functionality
3. **Refactor UI** - Update admin pages to work with the new permission/role structure

## Files That Need Updates

- `src/app/[locale]/admin/access-control/roles/page.tsx` - Multiple route updates needed
- `src/app/[locale]/admin/access-control/permissions/page.tsx` - Permission CRUD routes
- `src/app/[locale]/admin/access-control/modules/page.tsx` - Complete refactor needed (modules concept changed)

