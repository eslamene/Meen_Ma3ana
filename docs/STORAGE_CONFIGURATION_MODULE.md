# Storage Configuration Module

## Overview

The Storage Configuration module provides a comprehensive interface for managing Supabase Storage buckets and configuring upload rules. This module allows administrators to:

- View all storage buckets
- Configure file size limits per bucket
- Set allowed file types per bucket
- Validate uploads against configured rules

## Architecture

### Database Schema

**Table: `storage_rules`**
- `id` (UUID, Primary Key)
- `bucket_name` (TEXT, Unique)
- `max_file_size_mb` (INTEGER, Default: 5)
- `allowed_extensions` (TEXT[], Default: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'])
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Migration:** `supabase/migrations/058_create_storage_rules_table.sql`

### API Routes

1. **GET `/api/storage/buckets`**
   - Lists all storage buckets
   - Includes storage rules if configured
   - Requires `manage:files` permission

2. **GET `/api/storage/buckets/[name]`**
   - Gets detailed information about a specific bucket
   - Includes bucket metadata and storage rules
   - Requires `manage:files` permission

3. **POST `/api/storage/rules/update`**
   - Creates or updates storage rules for a bucket
   - Validates input (bucket exists, positive file size, non-empty extensions)
   - Requires `manage:files` permission

### Utilities

**`lib/storage/validateUpload.ts`**
- Validates file uploads against storage rules
- Checks file size and extension
- Returns validation result with error message if invalid
- Falls back to defaults if no rules are configured

**`lib/storage/server.ts`**
- Creates Supabase admin client with service role key
- Used for server-side storage operations

### UI Components

**Page: `/[locale]/admin/settings/storage`**
- Main storage configuration page
- Displays table of all buckets
- Shows bucket metadata and configured rules
- Requires `manage:files` permission

**Component: `BucketDetailsDialog`**
- Modal dialog for viewing and editing bucket configuration
- Allows setting max file size and allowed extensions
- Updates storage rules via API

## Usage

### Setting Up Storage Rules

1. Navigate to `/admin/settings/storage`
2. Click "View Details" on any bucket
3. Configure:
   - Maximum file size (in MB)
   - Allowed file extensions (multi-select)
4. Click "Save Rules"

### Using Validation in Upload Routes

```typescript
import { validateUpload } from '@/lib/storage/validateUpload'

const validation = await validateUpload(bucketName, file)
if (!validation.valid) {
  return NextResponse.json(
    { error: validation.error },
    { status: 400 }
  )
}
```

### Default Behavior

If no storage rules are configured for a bucket:
- Maximum file size: 5MB
- Allowed extensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']

## Security

- All API routes require `manage:files` permission
- Storage rules table has RLS enabled
- Only admins can create/update/delete storage rules
- Service role key is used only in server-side API routes

## Integration

The upload route (`/api/upload`) has been updated to use the validation utility. All file uploads are now validated against configured storage rules.

## Files Created

1. **Database:**
   - `supabase/migrations/058_create_storage_rules_table.sql`

2. **API Routes:**
   - `src/app/api/storage/buckets/route.ts`
   - `src/app/api/storage/buckets/[name]/route.ts`
   - `src/app/api/storage/rules/update/route.ts`

3. **Utilities:**
   - `src/lib/storage/types.ts`
   - `src/lib/storage/server.ts`
   - `src/lib/storage/validateUpload.ts`

4. **UI Components:**
   - `src/components/ui/table.tsx`
   - `src/components/storage/BucketDetailsDialog.tsx`
   - `src/app/[locale]/admin/settings/storage/page.tsx`

5. **Translations:**
   - Added `admin.storage` section to `messages/en.json` and `messages/ar.json`

## Next Steps

1. **Run the database migrations:**
   ```bash
   # Apply migrations via Supabase CLI or Dashboard
   # Migration 058: Creates storage_rules table
   # Migration 059: Adds manage:files permission
   supabase migration up
   ```
   
   Or apply manually via Supabase Dashboard SQL Editor:
   - Run `supabase/migrations/058_create_storage_rules_table.sql`
   - Run `supabase/migrations/059_add_manage_files_permission.sql`

2. **Verify permissions:**
   - The `manage:files` permission should be automatically assigned to `admin` and `super_admin` roles
   - If you need to assign it to other roles, use the admin panel or run:
   ```sql
   INSERT INTO admin_role_permissions (role_id, permission_id)
   SELECT r.id, p.id
   FROM admin_roles r, admin_permissions p
   WHERE r.name = 'your_role_name' AND p.name = 'manage:files';
   ```

2. Add menu item for storage configuration (optional):
   - Add entry to navigation_items table
   - Link to `/[locale]/admin/settings/storage`

3. Test the module:
   - Create storage rules for existing buckets
   - Test file uploads with different file sizes and types
   - Verify validation works correctly

