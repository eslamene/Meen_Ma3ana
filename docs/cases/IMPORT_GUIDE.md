# Contribution Import System - Complete Guide

## Overview

This system imports contributions from a CSV file (`docs/cases/contributions.csv`) into the Supabase database, creating user accounts for each unique contributor and properly linking all contributions, cases, and notifications.

## Quick Start

### Prerequisites

1. **Environment Variables** (in `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

2. **CSV File**:
   - Location: `docs/cases/contributions.csv`
   - Required columns: `ID`, `Description`, `Contributor`, `ContributorID`, `Amount`, `Month`
   - **Important**: Unknown contributors should have `ContributorID = 100`

3. **Database Setup**:
   - All required tables must exist
   - Payment methods must be configured
   - Case categories must exist
   - Admin roles must exist (including 'donor')

### Import Process

**Option 1: Run Individual Scripts (Recommended for First Time)**

```bash
# Step 1: Clear all existing data
node scripts/import/01-clear-all-data.js

# Step 2: Import contributions
node scripts/import/02-import-contributions-with-users.js

# Step 3: Verify import
node scripts/import/03-verify-import.js
```

**Option 2: Run Master Script**

```bash
# Runs all steps automatically
node scripts/import/00-run-full-import.js
```

## Scripts Overview

### Main Import Scripts

1. **`scripts/import/01-clear-all-data.js`**
   - Clears all cases, contributions, notifications, and approval statuses
   - **WARNING**: This will delete all existing data!

2. **`scripts/import/02-import-contributions-with-users.js`**
   - Main import script that processes the CSV
   - Creates users, cases, contributions, approval statuses, and notifications
   - Handles ContributorID = 100 as "Unknown Contributor"

3. **`scripts/import/03-verify-import.js`**
   - Verifies the import was successful
   - Compares CSV totals with database totals
   - Reports any discrepancies

### Utility Scripts

- **`scripts/verification/11-check-contribution-totals.js`** - Compare CSV vs database totals
- **`scripts/verification/12-check-duplicate-contributions.js`** - Find duplicate contributions
- **`scripts/cleanup/20-remove-duplicate-contributions.js`** - Remove duplicate contributions
- **`scripts/backfill/30-backfill-contribution-notifications.js`** - Backfill notifications for existing contributions
- **`scripts/backfill/31-backfill-donor-pending-notifications.js`** - Add pending notifications for donors
- **`scripts/admin/40-assign-donor-role-to-all.js`** - Assign 'donor' role to all users

## CSV File Requirements

### Format
```csv
ID,Description,Contributor,ContributorID,Amount,Month
56,تلاجه بنت عامله النضافه,Muna,83,1000,01/09/2025
85,بنت ام فاروق السنان,Unknown,100,25000,01/09/2025
```

### Important Notes:
- **ContributorID = 100**: Used for unknown/unnamed contributors
- **Date Format**: `DD/MM/YYYY` (e.g., `01/09/2025`)
- **Amount**: Numeric value (commas are automatically removed)
- **Description**: Arabic text (can contain commas, properly handled)

## User Account Creation

### Email Format
- Regular contributors: `contributor<ID>@contributor.meenma3ana.local`
  - Example: `contributor0001@contributor.meenma3ana.local`
- Unknown contributors (ID=100): `unknown@contributor.meenma3ana.local`

### User Properties
- **Role**: `donor` (automatically assigned via trigger)
- **Email Verified**: `true` (auto-confirmed)
- **Language**: `ar` (Arabic)
- **Password**: Randomly generated (users can reset via "Forgot Password")

## Notification System

The import automatically creates notifications:

1. **Admin Notifications** (`contribution_pending`):
   - Sent to all active admins/super_admins
   - Created when each contribution is imported

2. **Donor Notifications**:
   - **`contribution_pending`**: When contribution is submitted
   - **`contribution_approved`**: When contribution is approved
   - Both notifications are created for historical imports

## Troubleshooting

### Issue: "Database error creating new user"
- **Solution**: Ensure migration `034_ultra_robust_trigger_fix.sql` is applied

### Issue: "Only 50 users visible"
- **Solution**: The admin API now paginates correctly. Refresh the page.

### Issue: "Users not assigned donor role"
- **Solution**: Run `node scripts/40-assign-donor-role-to-all.js`

### Issue: "Total doesn't match CSV"
- **Solution**: 
  1. Run `node scripts/verification/11-check-contribution-totals.js` to identify discrepancy
  2. Run `node scripts/verification/12-check-duplicate-contributions.js` to find duplicates
  3. Run `node scripts/cleanup/20-remove-duplicate-contributions.js` if needed

### Issue: "Missing notifications"
- **Solution**: 
  - For all notifications: `node scripts/backfill/30-backfill-contribution-notifications.js`
  - For donor pending: `node scripts/backfill/31-backfill-donor-pending-notifications.js`

## Migration Plan

See `docs/cases/IMPORT_MIGRATION_PLAN.md` for detailed step-by-step migration instructions.

## File Structure

```
scripts/
├── 00-run-full-import.js          # Master script (runs all steps)
├── 01-clear-all-data.js           # Clear existing data
├── 02-import-contributions-with-users.js  # Main import
├── 03-verify-import.js            # Verification
├── 11-check-contribution-totals.js   # Compare CSV vs DB
├── 12-check-duplicate-contributions.js  # Find duplicates
├── 20-remove-duplicate-contributions.js  # Remove duplicates
└── 30-backfill-*.js                  # Backfill scripts

docs/cases/
├── contributions.csv              # Source CSV file
├── IMPORT_GUIDE.md                # This file
├── IMPORT_MIGRATION_PLAN.md       # Detailed migration plan
└── QUICK_START.md                 # Quick reference
```

## Best Practices

1. **Always backup** before running clear scripts
2. **Test with small CSV** first before full import
3. **Verify totals** after import using verification script
4. **Check for duplicates** if totals don't match
5. **Review notifications** to ensure they were created correctly

