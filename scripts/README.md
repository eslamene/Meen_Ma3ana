# Scripts Directory

This directory contains all utility scripts for the Meen Ma3ana project.

## Script Organization

Scripts are organized by category using numbered prefixes:

### Main Import Scripts (00-09)
- **`00-run-full-import.js`** - Master script (runs all import steps)
- **`01-clear-all-data.js`** - Clear all cases, contributions, notifications
- **`02-import-contributions-with-users.js`** - Main import script
- **`03-verify-import.js`** - Verify import results

### Check/Verify Scripts (10-19)
- **`10-check-extra-contributions.js`** - Find contributions not in CSV
- **`11-check-contribution-totals.js`** - Compare CSV vs database totals
- **`12-check-duplicate-contributions.js`** - Find duplicate contributions

### Remove/Cleanup Scripts (20-29)
- **`20-remove-duplicate-contributions.js`** - Remove duplicate contributions

### Backfill Scripts (30-39)
- **`30-backfill-contribution-notifications.js`** - Backfill all contribution notifications
- **`31-backfill-donor-pending-notifications.js`** - Backfill donor pending notifications

### Assign/Role Scripts (40-49)
- **`40-assign-donor-role-to-all.js`** - Assign 'donor' role to all users
- **`41-assign-super-admin.js`** - Assign super admin role to a user

### Utility Scripts (50-59)
- **`50-utility-merge-contributors.js`** - Merge contributor accounts
- **`51-utility-recalculate-case-amounts.js`** - Recalculate case amounts

### Setup Scripts (60-69)
- **`60-setup-storage-buckets.js`** - Setup storage buckets
- **`setup-env.js`** - Setup environment variables
- **`setup-admin-system.sh`** - Setup admin system (shell script)

### Admin Scripts (70-79)
- **`70-admin-create-user.js`** - Create admin user
- **`71-admin-add-user.js`** - Add user to system
- **`72-admin-seed-data.js`** - Seed initial data

### Development Scripts
- **`dev.js`** - Task Master CLI (AI-driven development task management)

### Internationalization (i18n/)
- **`i18n/`** - Internationalization scripts
  - `find-unused-keys.js` - Find unused translation keys
  - `sync-i18n.js` - Sync translations
  - `validate-i18n.js` - Validate translations

## Quick Reference

### Import Process
```bash
# Full import (recommended)
node scripts/00-run-full-import.js

# Or step by step
node scripts/01-clear-all-data.js
node scripts/02-import-contributions-with-users.js
node scripts/03-verify-import.js
```

### Verification
```bash
# Check totals
node scripts/11-check-contribution-totals.js

# Check for duplicates
node scripts/12-check-duplicate-contributions.js

# Check for extra contributions
node scripts/10-check-extra-contributions.js
```

### Maintenance
```bash
# Remove duplicates
node scripts/20-remove-duplicate-contributions.js

# Backfill notifications
node scripts/30-backfill-contribution-notifications.js
node scripts/31-backfill-donor-pending-notifications.js

# Assign roles
node scripts/40-assign-donor-role-to-all.js
node scripts/41-assign-super-admin.js --email=user@example.com
```

### Utilities
```bash
# Merge contributors
node scripts/50-utility-merge-contributors.js --from=<userId> --to=<userId>

# Recalculate case amounts
node scripts/51-utility-recalculate-case-amounts.js
```

## Documentation

- See `docs/cases/IMPORT_GUIDE.md` for complete import documentation
- See `docs/cases/QUICK_START.md` for quick start guide
- See `docs/cases/IMPORT_MIGRATION_PLAN.md` for migration plan

## Notes

- All scripts require `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Scripts use ES modules (import/export syntax)
- Numbered prefixes help maintain order and organization
- Shell scripts (.sh) are kept for compatibility but JS scripts are preferred
