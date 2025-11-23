# User Merge Safety & Rollback System

## Overview

The user merge system now includes comprehensive safety features including:
- **Pre-merge validation and preview**
- **Automatic backup before merge**
- **Rollback capability**
- **Enhanced error handling**

## Safety Features

### 1. Pre-Merge Preview

Before executing a merge, you can preview what will be merged:

```bash
GET /api/admin/users/merge/preview?fromUserId=<uuid>&toUserId=<uuid>
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "source_user": { "id": "...", "email": "...", ... },
    "target_user": { "id": "...", "email": "...", ... },
    "records_to_migrate": {
      "contributions": 43,
      "notifications": 12,
      ...
    },
    "validation": {
      "can_merge": true,
      "warnings": [],
      "errors": []
    }
  },
  "summary": {
    "total_records_to_migrate": 165,
    "tables_affected": ["contributions", "notifications", ...],
    "validation_passed": true,
    "has_warnings": false
  }
}
```

### 2. Automatic Backup

Every merge operation automatically creates a backup **before** any changes are made:

- Backup is stored in `user_merge_backups` table
- Contains complete snapshot of all data that will be migrated
- Backup is created using database function for atomicity
- If backup creation fails, merge is **aborted** for safety

### 3. Merge Operation

```bash
POST /api/admin/users/merge
{
  "fromUserId": "<uuid>",
  "toUserId": "<uuid>",
  "deleteSource": false
}
```

**Response includes:**
```json
{
  "success": true,
  "merge_id": "<uuid>",
  "backup_id": "<uuid>",
  "stats": { ... },
  "rollback_info": {
    "merge_id": "<uuid>",
    "rollback_endpoint": "/api/admin/users/merge/rollback",
    "note": "Save the merge_id to rollback this operation if needed"
  }
}
```

**Important:** Save the `merge_id` from the response for rollback!

### 4. Rollback Operation

If something goes wrong, you can rollback the merge:

```bash
POST /api/admin/users/merge/rollback
{
  "mergeId": "<merge_id_from_merge_response>"
}
```

**What rollback does:**
- Restores all migrated records to their original user
- Restores source user account if it was deleted
- Recalculates case amounts
- Marks backup as "rolled_back"
- Returns statistics of restored records

## Workflow

### Recommended Workflow

1. **Preview the merge:**
   ```bash
   GET /api/admin/users/merge/preview?fromUserId=...&toUserId=...
   ```
   - Review what will be migrated
   - Check for warnings or errors
   - Verify record counts

2. **Execute the merge:**
   ```bash
   POST /api/admin/users/merge
   {
     "fromUserId": "...",
     "toUserId": "...",
     "deleteSource": false
   }
   ```
   - **Save the `merge_id` from response!**
   - Review the statistics
   - Verify the merge was successful

3. **If needed, rollback:**
   ```bash
   POST /api/admin/users/merge/rollback
   {
     "mergeId": "<saved_merge_id>"
   }
   ```

## Database Schema

### `user_merge_backups` Table

Stores backup snapshots of merge operations:

- `id` - Backup record ID
- `merge_id` - Unique identifier for the merge operation
- `from_user_id` - Source user ID
- `to_user_id` - Target user ID
- `admin_user_id` - Admin who performed the merge
- `delete_source` - Whether source user was deleted
- `backup_data` - JSONB containing all backed up records
- `status` - 'pending', 'completed', 'rolled_back', 'failed'
- `total_records_backed_up` - Count of records in backup
- `total_records_migrated` - Count of records actually migrated
- `errors` - JSONB array of any errors
- `created_at`, `completed_at`, `rolled_back_at` - Timestamps

## Safety Guarantees

1. **Backup is created BEFORE merge** - If backup fails, merge is aborted
2. **All operations are logged** - Full audit trail in `rbac_audit_log`
3. **Rollback is available** - Can restore to previous state
4. **Validation before merge** - Preview endpoint catches issues early
5. **Error handling** - Non-critical errors don't stop the merge, but are logged

## Limitations

1. **Rollback must be done before new data is added** - If new contributions are made to the target user after merge, rollback may cause conflicts
2. **Source user restoration** - If source user was deleted and new user with same email exists, restoration may fail
3. **Activity logs** - Site activity logs are migrated but rollback may not perfectly restore session continuity
4. **Time-sensitive** - Rollback should be done as soon as possible after merge if needed

## Testing

### Test Merge Flow

1. Create two test users
2. Add test data to source user (contributions, notifications, etc.)
3. Preview the merge
4. Execute the merge
5. Verify data is migrated correctly
6. Test rollback
7. Verify data is restored correctly

### Test Scenarios

- ✅ Merge with no data
- ✅ Merge with contributions only
- ✅ Merge with multiple table types
- ✅ Merge with deleteSource=true
- ✅ Rollback after merge
- ✅ Preview validation warnings
- ✅ Error handling (invalid users, etc.)

## Best Practices

1. **Always preview before merging** - Use the preview endpoint first
2. **Save the merge_id** - Store it for potential rollback
3. **Test in development first** - Test merge/rollback flow before production
4. **Monitor after merge** - Check that data looks correct
5. **Rollback quickly if needed** - Don't wait if you need to rollback
6. **Document merges** - Keep records of why merges were done

## Troubleshooting

### Backup Creation Fails

- Check database permissions
- Verify `create_user_merge_backup` function exists
- Check database logs for errors
- Ensure service role key has proper permissions

### Rollback Fails

- Check that merge_id is correct
- Verify backup status is 'completed'
- Check for constraint violations (e.g., duplicate emails)
- Review error messages in response

### Merge Partially Fails

- Check the `errors` array in response
- Review logs for specific table errors
- Non-critical errors are logged but don't stop merge
- Critical errors (like contributions) will stop the merge

## Migration

Apply the migration to enable backup system:

```bash
psql $DATABASE_URL -f supabase/migrations/078_create_user_merge_backup_system.sql
```

Or using Supabase CLI:

```bash
supabase migration up
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/users/merge/preview` | GET | Preview what will be merged |
| `/api/admin/users/merge` | POST | Execute the merge |
| `/api/admin/users/merge/rollback` | POST | Rollback a merge |

All endpoints require admin authentication.

