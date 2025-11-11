# Contribution Import System - Complete Guide

## Overview

This system imports contributions from a CSV file (`docs/cases/contributions.csv`) into the Supabase database, creating user accounts for each unique contributor and properly linking all contributions, cases, and notifications.

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `DATABASE_URL` - PostgreSQL connection string (optional, for direct SQL operations)

2. **CSV File Format**:
   - Location: `docs/cases/contributions.csv`
   - Required columns: `ID`, `Description`, `Contributor`, `ContributorID`, `Amount`, `Month`
   - **Important**: Unknown contributors should have `ContributorID = 100` (not 0)

3. **Database Setup**:
   - All required tables must exist (cases, contributions, users, notifications, etc.)
   - Payment methods must be configured
   - Case categories must exist
   - Admin roles must exist (including 'donor' role)

## Import Process Overview

The import process follows these steps:

1. **Clear existing data** (cases, contributions, notifications, approval statuses)
2. **Create user accounts** for each unique ContributorID
3. **Create cases** from CSV data
4. **Create contributions** linked to proper users and cases
5. **Create approval statuses** for all contributions
6. **Create notifications** for admins and donors
7. **Update case amounts** to reflect total contributions

## Scripts Organization

### Main Import Scripts (Run in Order)

1. **`scripts/01-clear-all-data.js`**
   - Clears all cases, contributions, notifications, and approval statuses
   - **WARNING**: This will delete all existing data!

2. **`scripts/02-import-contributions-with-users.js`**
   - Main import script that processes the CSV
   - Creates users, cases, contributions, approval statuses, and notifications
   - Handles ContributorID = 100 as "Unknown Contributor"

3. **`scripts/03-verify-import.js`**
   - Verifies the import was successful
   - Compares CSV totals with database totals
   - Reports any discrepancies

### Utility Scripts

- **`scripts/check-contribution-totals.js`** - Compare CSV vs database totals
- **`scripts/check-duplicate-contributions.js`** - Find duplicate contributions
- **`scripts/remove-duplicate-contributions.js`** - Remove duplicate contributions
- **`scripts/backfill-contribution-notifications.js`** - Backfill notifications for existing contributions
- **`scripts/assign-donor-role-to-all.js`** - Assign 'donor' role to all users

## Quick Start

### Option 1: Run Individual Scripts (Recommended for First Time)

```bash
# Step 1: Clear all existing data
node scripts/01-clear-all-data.js

# Step 2: Import contributions
node scripts/02-import-contributions-with-users.js

# Step 3: Verify import
node scripts/03-verify-import.js
```

### Option 2: Run Master Script (After Testing)

```bash
# Run all steps in sequence
node scripts/00-run-full-import.js
```

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
   - Uses contribution creation date

2. **Donor Notifications** (`contribution_approved`):
   - Sent to the contributor
   - Created for all approved contributions
   - Uses contribution creation date

## Troubleshooting

### Issue: "Database error creating new user"
- **Solution**: Ensure the trigger `assign_donor_role_to_new_user` has proper error handling
- Check migration `supabase/migrations/034_ultra_robust_trigger_fix.sql`

### Issue: "Only 50 users visible"
- **Solution**: The admin API now paginates correctly. Refresh the page.

### Issue: "Users not assigned donor role"
- **Solution**: Run `node scripts/assign-donor-role-to-all.js`

### Issue: "Total doesn't match CSV"
- **Solution**: Run `node scripts/check-contribution-totals.js` to identify discrepancies
- Check for duplicate contributions with `node scripts/check-duplicate-contributions.js`

### Issue: "Missing notifications"
- **Solution**: Run `node scripts/backfill-contribution-notifications.js`

## Migration History

### Key Changes:
1. **ContributorID = 0 → 100**: Changed unknown contributor ID from 0 to 100
2. **Proper CSV Parsing**: Fixed CSV parsing to handle commas in Arabic text
3. **Notification Integration**: All contributions now have notifications
4. **Date Preservation**: Contribution dates are preserved from CSV
5. **Duplicate Prevention**: Scripts check for existing users before creating

## Best Practices

1. **Always backup** before running clear scripts
2. **Test with small CSV** first before full import
3. **Verify totals** after import using verification script
4. **Check for duplicates** if totals don't match
5. **Review notifications** to ensure they were created correctly

## File Structure

```
scripts/
├── 00-run-full-import.js          # Master script (runs all steps)
├── 01-clear-all-data.js           # Clear existing data
├── 02-import-contributions-with-users.js  # Main import
├── 03-verify-import.js            # Verification
├── check-contribution-totals.js   # Compare CSV vs DB
├── check-duplicate-contributions.js  # Find duplicates
├── remove-duplicate-contributions.js  # Remove duplicates
└── backfill-contribution-notifications.js  # Backfill notifications

docs/cases/
└── contributions.csv              # Source CSV file

supabase/migrations/
└── 034_ultra_robust_trigger_fix.sql  # Trigger fix for user creation
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the script output for error messages
3. Verify environment variables are set correctly
4. Check database permissions and triggers

