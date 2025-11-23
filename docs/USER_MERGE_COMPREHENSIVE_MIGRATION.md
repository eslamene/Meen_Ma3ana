# Comprehensive User Merge Migration

## Overview

The user merge functionality has been completely overhauled to ensure **all user-related data** is properly migrated when merging two user accounts. This document outlines what was changed and what data is now being migrated.

## What Was Changed

### 1. Updated Merge API Route (`src/app/api/admin/users/merge/route.ts`)

The merge route now handles **19 different types of user-related data** across multiple tables:

#### Core User Data
1. **Contributions** (`donor_id`) - All donations made by the source user
2. **Notifications** (`recipient_id`) - All notifications sent to the source user
3. **Recurring Contributions** (`donor_id`) - All recurring donation schedules
4. **Sponsorships** (`sponsor_id`) - All sponsorship records

#### Communication & Cases
5. **Communications** (`sender_id`, `recipient_id`) - All messages sent/received
6. **Cases** (`created_by`, `assigned_to`, `sponsored_by`) - All case records
7. **Case Status History** (`changed_by`) - All case status change records
8. **Case Updates** (`created_by`) - All case update posts

#### Projects & Approvals
9. **Projects** (`created_by`, `assigned_to`) - All project records
10. **Contribution Approval Status** (`admin_id`) - All approval records

#### System Configuration
11. **Category Detection Rules** (`created_by`, `updated_by`) - All category rules
12. **Landing Stats** (`updated_by`) - All landing page statistics
13. **System Config** (`updated_by`) - All system configuration changes
14. **System Content** (`updated_by`) - All system content updates

#### Activity & Audit Logs
15. **Site Activity Logs** (`user_id`) - All user activity tracking
16. **Beneficiaries** (`created_by`) - All beneficiary records created
17. **Beneficiary Documents** (`uploaded_by`) - All beneficiary document uploads
18. **Audit Logs** (`user_id`) - All audit trail records (rbac_audit_log and audit_logs)

#### User Deletion
19. **Source User Account** - Optionally delete the source user after merge

### 2. Created Migration (`supabase/migrations/077_ensure_user_merge_support.sql`)

This migration:
- Documents all tables that need to be updated during merge
- Creates a helper function `verify_user_merge_readiness()` to check what data will be migrated
- Ensures proper foreign key constraints allow updates
- Adds helpful comments and documentation

## Key Features

### Comprehensive Data Migration
- **All user references are updated** - No data is left orphaned
- **Multiple fields per table** - Handles tables with multiple user references (e.g., cases has created_by, assigned_to, sponsored_by)
- **Activity tracking preserved** - All activity logs and audit trails are maintained

### Error Handling
- **Graceful error handling** - Non-critical errors are logged but don't stop the merge
- **Detailed statistics** - Returns counts of all migrated records
- **Error reporting** - Lists any errors that occurred during migration

### Case Amount Recalculation
- Automatically recalculates case amounts for all affected cases after contributions are merged
- Ensures financial totals remain accurate

## Usage

The merge function is accessible via the admin UI or directly via API:

```typescript
POST /api/admin/users/merge
{
  "fromUserId": "source-user-uuid",
  "toUserId": "target-user-uuid",
  "deleteSource": false  // Optional, defaults to false
}
```

### Response

```json
{
  "success": true,
  "message": "Successfully merged accounts. 150 total records reassigned.",
  "stats": {
    "contributions": 43,
    "notifications": 12,
    "recurring_contributions": 2,
    "sponsorships": 0,
    "communications": 5,
    "cases": 8,
    "case_status_history": 15,
    "case_updates": 3,
    "projects": 1,
    "contribution_approval_status": 10,
    "category_detection_rules": 0,
    "landing_stats": 0,
    "system_config": 2,
    "system_content": 1,
    "site_activity_logs": 45,
    "beneficiaries": 3,
    "beneficiary_documents": 7,
    "audit_logs": 8,
    "audit_logs_table": 0,
    "total_records_migrated": 165,
    "source_user_deleted": false
  }
}
```

## Testing Recommendations

1. **Test with sample data** - Create test users with various types of data
2. **Verify all records** - Check that all expected records are migrated
3. **Test error scenarios** - Test with missing users, invalid IDs, etc.
4. **Test with deleteSource=true** - Ensure source user is properly deleted
5. **Verify case amounts** - Confirm case totals are recalculated correctly

## Migration Steps

To apply the migration:

```bash
# Apply the migration
psql $DATABASE_URL -f supabase/migrations/077_ensure_user_merge_support.sql
```

Or if using Supabase CLI:

```bash
supabase migration up
```

## Verification

You can verify merge readiness using the helper function:

```sql
SELECT * FROM verify_user_merge_readiness(
  'source-user-uuid'::UUID,
  'target-user-uuid'::UUID
);
```

This will show you:
- Which tables have records to migrate
- How many records will be migrated from each table
- Whether the merge can proceed

## Notes

- The merge uses the **service role client** to bypass RLS policies
- All updates include `updated_at` timestamps
- The merge is **transactional** - if critical operations fail, the merge stops
- Non-critical errors (like missing optional tables) are logged but don't stop the merge
- The merge process is **logged** in the audit trail for security

## Future Enhancements

Potential improvements for future versions:
- Add merge preview before execution
- Add rollback capability
- Add merge history tracking
- Add batch merge capability
- Add merge conflict resolution for duplicate data

