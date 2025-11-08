# Entities to Clear for Cases and Contributions

This document lists all database entities that need to be cleared when resetting cases and contributions data.

## 📋 **Complete List of Entities**

### **1. Direct Case Dependencies (Foreign Key: `case_id`)**

These tables have a direct foreign key relationship with `cases` and will be deleted when cases are deleted (if CASCADE is enabled) or must be deleted first:

1. **`case_files`** ⚠️
   - **Relationship**: `case_id` → `cases.id` (ON DELETE CASCADE)
   - **Purpose**: Unified storage for all case files (images, documents, videos, etc.)
   - **Note**: Replaces old `case_images` table

2. **`case_images`** ⚠️ (Legacy - may be renamed to `case_images_backup`)
   - **Relationship**: `case_id` → `cases.id`
   - **Purpose**: Legacy case images (if still exists)
   - **Note**: May have been migrated to `case_files`

3. **`case_status_history`** ⚠️
   - **Relationship**: `case_id` → `cases.id`
   - **Purpose**: Tracks status changes for cases
   - **Contains**: Status transitions, change reasons, who changed it

4. **`case_updates`** ⚠️
   - **Relationship**: `case_id` → `cases.id`
   - **Purpose**: Public updates and progress reports for cases
   - **Contains**: Update titles, content, attachments, update types

5. **`contributions`** ⚠️
   - **Relationship**: `case_id` → `cases.id` (nullable, but we want to delete case-related ones)
   - **Purpose**: All donations/contributions to cases
   - **Note**: Only delete where `case_id IS NOT NULL`

6. **`recurring_contributions`** ⚠️
   - **Relationship**: `case_id` → `cases.id` (nullable)
   - **Purpose**: Recurring contribution schedules for cases
   - **Note**: Only delete where `case_id IS NOT NULL`

7. **`sponsorships`** ⚠️
   - **Relationship**: `case_id` → `cases.id` (nullable)
   - **Purpose**: Sponsorship agreements for cases
   - **Note**: Only delete where `case_id IS NOT NULL`

### **2. Contribution Dependencies (Foreign Key: `contribution_id`)**

These tables depend on `contributions` and must be deleted when contributions are deleted:

8. **`contribution_approval_status`** ⚠️
   - **Relationship**: `contribution_id` → `contributions.id` (ON DELETE CASCADE)
   - **Purpose**: Approval workflow for contributions
   - **Contains**: Status, admin comments, rejection reasons, donor replies

### **3. Notifications (References via JSONB `data` field)**

9. **`notifications`** ⚠️
   - **Relationship**: References cases/contributions via `data` JSONB field
   - **Types to delete**:
     - `contribution_approved` (references contribution_id in data)
     - `contribution_rejected` (references contribution_id in data)
     - `contribution_pending` (references contribution_id in data)
     - `case_update` (references case_id in data)
     - `case_progress` (references case_id in data)
     - `case_contribution` (references case_id in data)
     - `case_milestone` (references case_id in data)
   - **Note**: Must filter by notification type and data field

### **4. Main Tables**

10. **`cases`** ⚠️⚠️⚠️
    - **Purpose**: Main cases table
    - **Contains**: All case information (titles, descriptions, amounts, status, etc.)
    - **Note**: This is the root table - delete last

### **5. Tables to KEEP (Do NOT Delete)**

These tables should **NOT** be cleared as they are reference data or used by other parts of the system:

- ✅ **`case_categories`** - Keep (reference data, used by other cases)
- ✅ **`users`** - Keep (user accounts, not case-specific)
- ✅ **`payment_methods`** - Keep (reference data)
- ✅ **`projects`** - Keep (separate from cases)
- ✅ **`project_cycles`** - Keep (related to projects, not cases)
- ✅ **`communications`** - Keep (user-to-user messages, not case-specific)
- ✅ **`localization`** - Keep (translation data)
- ✅ **`landing_stats`** - Keep (may be recalculated, but not case-specific)
- ✅ **`system_config`** - Keep (system configuration)

## 🔄 **Deletion Order (Important!)**

Due to foreign key constraints, delete in this order:

1. **First**: Delete dependent records (child tables)
   - `contribution_approval_status` (depends on contributions)
   - `case_files` (depends on cases)
   - `case_images` (depends on cases, if exists)
   - `case_status_history` (depends on cases)
   - `case_updates` (depends on cases)
   - `notifications` (filtered by type and data field)
   - `contributions` WHERE `case_id IS NOT NULL` (depends on cases)
   - `recurring_contributions` WHERE `case_id IS NOT NULL` (depends on cases)
   - `sponsorships` WHERE `case_id IS NOT NULL` (depends on cases)

2. **Last**: Delete main table
   - `cases` (root table)

## ⚠️ **Important Notes**

- **Contributions**: Only delete contributions where `case_id IS NOT NULL` (keep project-related contributions)
- **Notifications**: Must filter by notification type and check `data` JSONB field for case/contribution references
- **Case Categories**: Keep `case_categories` table (it's reference data)
- **Users**: Keep `users` table (user accounts are not case-specific)
- **Cascade Deletes**: Some tables have `ON DELETE CASCADE`, but it's safer to delete explicitly in order

## 📊 **Expected Counts After Deletion**

After running the clear script, you should see:
- `cases`: 0
- `contributions` (case-related): 0
- `contribution_approval_status`: 0
- `case_files`: 0
- `case_images`: 0 (if exists)
- `case_status_history`: 0
- `case_updates`: 0
- `recurring_contributions` (case-related): 0
- `sponsorships` (case-related): 0
- `notifications` (case/contribution-related): 0

