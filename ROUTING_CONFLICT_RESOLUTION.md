# Next.js Routing Conflict Resolution

## Issue Description

The Next.js development server was failing to start with the error:
```
[Error: You cannot use different slug names for the same dynamic path ('id' !== 'roleId').]
```

## Root Cause

There were two conflicting dynamic route files for the same API endpoint:

- `src/app/api/admin/rbac/roles/[roleId]/permissions/route.ts`
- `src/app/api/admin/rbac/roles/[id]/permissions/route.ts`

Both files were identical in functionality but used different parameter names (`roleId` vs `id`), which Next.js doesn't allow for the same route pattern.

## Resolution

1. **Identified the conflict**: Both files contained identical code
2. **Removed the duplicate**: Deleted the `[roleId]` version to maintain consistency
3. **Kept the `[id]` version**: This matches the existing pattern used throughout the codebase
4. **Cleaned up directories**: Removed empty directories after file deletion

## Files Modified

- ❌ **Removed**: `src/app/api/admin/rbac/roles/[roleId]/permissions/route.ts`
- ❌ **Removed**: `src/app/api/admin/rbac/roles/[roleId]/permissions/` (directory)
- ❌ **Removed**: `src/app/api/admin/rbac/roles/[roleId]/` (directory)
- ✅ **Kept**: `src/app/api/admin/rbac/roles/[id]/permissions/route.ts`

## Scripts Created

### 1. `scripts/fix-routing-conflict.js`
Basic script that identifies and removes duplicate route files.

### 2. `scripts/enhanced-routing-fix.js`
Enhanced script with:
- Backup creation for rollback capability
- Frontend reference scanning
- Detailed reporting
- Validation checks

### 3. `scripts/validate-routing.js`
Validation script that:
- Scans all dynamic routes
- Identifies potential conflicts
- Provides health check for routing system

## Usage

```bash
# Fix routing conflicts
node scripts/fix-routing-conflict.js

# Enhanced fix with backup and reporting
node scripts/enhanced-routing-fix.js

# Validate routing (no conflicts)
node scripts/validate-routing.js
```

## Verification

After running the fix:
1. ✅ Next.js server starts without errors
2. ✅ All dynamic routes use consistent parameter names
3. ✅ No conflicting route patterns exist
4. ✅ API endpoints remain functional

## Prevention

To prevent similar issues in the future:
1. Always use consistent parameter names for similar route patterns
2. Run the validation script before deploying
3. Review route structure when adding new dynamic routes
4. Consider using a naming convention (e.g., always use `id` for single resource routes)

## Rollback

If issues occur, restore from the backup created by the enhanced script:
```bash
# Backup location: .routing-backup/backup-[timestamp]/
```
