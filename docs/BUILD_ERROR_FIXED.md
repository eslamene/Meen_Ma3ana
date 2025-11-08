# Build Error Fixed ✅

## Problem
Build was failing because `src/lib/hooks/usePermissions.ts` was deleted but still being imported in multiple files.

## Files Fixed (4 files)

1. ✅ `src/app/[locale]/admin/page.tsx`
   - Changed: `usePermissions` → `useAdmin`
   - Updated: `userRole` now derived from `roles[0].name`

2. ✅ `src/app/[locale]/dashboard/page.tsx`
   - Changed: `usePermissions` → `useAdmin`
   - Updated: `userRole` now derived from `roles[0].name`

3. ✅ `src/app/[locale]/cases/[id]/page.tsx`
   - Changed: `usePermissions` → `useAdmin`
   - Updated: `hasPermission` now uses `useAdmin().hasPermission`

4. ✅ `src/app/[locale]/cases/page.tsx`
   - Changed: `usePermissions` → `useAdmin`
   - Updated: `canCreateCase` now uses `hasPermission('cases:create')`

## Changes Made

### Import Replacement
```typescript
// Before
import { usePermissions } from '@/lib/hooks/usePermissions'

// After
import { useAdmin } from '@/lib/admin/hooks'
```

### Role Access
```typescript
// Before
const { userRole } = usePermissions()

// After
const { roles } = useAdmin()
const userRole = roles.length > 0 ? roles[0].name : null
```

### Permission Checks
```typescript
// Before
const { hasPermission } = usePermissions()
const { canCreateCase } = usePermissions()

// After
const { hasPermission } = useAdmin()
const canCreateCase = hasPermission('cases:create')
```

## Verification

✅ No remaining imports of `usePermissions` found
✅ All files now use `useAdmin` hook
✅ Build should now succeed

## Next Steps

1. ✅ **Build error fixed** - All imports updated
2. ⏳ **Test the application** - Verify everything works
3. ⏳ **Remove old hook files** - After testing, remove:
   - `src/lib/hooks/usePermissions.ts` (already deleted)
   - `src/lib/hooks/useDatabasePermissions.ts`
   - `src/lib/hooks/useSimpleRBAC.ts`

