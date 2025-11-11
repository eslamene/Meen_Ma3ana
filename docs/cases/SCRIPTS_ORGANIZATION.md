# Import Scripts Organization Summary

## Scripts Overview

All import scripts are now organized in a numbered sequence for easy execution:

### Main Import Scripts (Run in Order)

1. **`scripts/01-clear-all-data.js`**
   - **Purpose**: Clears all cases, contributions, notifications, and approval statuses
   - **When to run**: Before importing new data
   - **WARNING**: This deletes all contribution-related data!

2. **`scripts/02-import-contributions-with-users.js`**
   - **Purpose**: Main import script - creates users, cases, contributions, and notifications
   - **When to run**: After clearing data
   - **Handles**: ContributorID = 100 for unknown contributors

3. **`scripts/03-verify-import.js`**
   - **Purpose**: Verifies import was successful
   - **When to run**: After import completes
   - **Checks**: CSV vs DB totals, notification counts, approval statuses

### Master Script

- **`scripts/00-run-full-import.js`**
  - **Purpose**: Runs all steps in sequence (01 → 02 → 03)
  - **When to run**: For automated full imports
  - **Includes**: 5-second warning before starting

### Utility Scripts

- **`scripts/check-contribution-totals.js`** - Compare CSV vs database totals
- **`scripts/check-duplicate-contributions.js`** - Find duplicate contributions
- **`scripts/remove-duplicate-contributions.js`** - Remove duplicate contributions
- **`scripts/backfill-contribution-notifications.js`** - Backfill notifications for existing contributions
- **`scripts/assign-donor-role-to-all.js`** - Assign 'donor' role to all users

## Key Changes from Previous Version

### ContributorID Handling
- **Old**: ContributorID = 0 for unknown contributors (skipped)
- **New**: ContributorID = 100 for unknown contributors (processed)
- **Email**: `unknown@contributor.meenma3ana.local`
- **Anonymous**: Contributions with ID=100 are marked as anonymous

### Script Organization
- **Old**: Single script with clear + import combined
- **New**: Separated into numbered steps for clarity and flexibility

### CSV Parsing
- **Fixed**: Proper CSV parsing that handles commas in Arabic text
- **Result**: Accurate total calculation (1,207,920 EGP)

### Notification Integration
- **Added**: Automatic notification creation during import
- **Types**: Admin notifications (pending) + Donor notifications (approved)

## Quick Start Guide

### First Time Setup

1. **Update CSV**:
   - Change all `ContributorID = 0` to `ContributorID = 100`
   - Verify CSV total is 1,207,920 EGP

2. **Run Import**:
   ```bash
   # Option 1: Run individually (recommended first time)
   node scripts/01-clear-all-data.js
   node scripts/02-import-contributions-with-users.js
   node scripts/03-verify-import.js
   
   # Option 2: Run master script
   node scripts/00-run-full-import.js
   ```

3. **Verify Results**:
   - Check admin panel for all users
   - Verify contribution totals match CSV
   - Check notifications are created

## Documentation Files

- **`docs/cases/IMPORT_README.md`** - Complete guide with troubleshooting
- **`docs/cases/IMPORT_MIGRATION_PLAN.md`** - Step-by-step migration plan

## Important Notes

1. **User Accounts**: Not deleted during clear (only cases/contributions)
2. **ContributorID 100**: Standard for unknown contributors
3. **Notifications**: Automatically created (1070 total for 535 contributions)
4. **Dates**: Preserved from CSV (DD/MM/YYYY format)
5. **Email Format**: `contributor<ID>@contributor.meenma3ana.local`

## Troubleshooting

See `docs/cases/IMPORT_README.md` for detailed troubleshooting guide.

Common issues:
- Trigger errors → Check migration `034_ultra_robust_trigger_fix.sql`
- Missing roles → Run `assign-donor-role-to-all.js`
- Totals mismatch → Run `check-contribution-totals.js` and `check-duplicate-contributions.js`

