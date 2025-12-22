# Scripts Directory

This directory contains utility scripts organized by category for the Meen Ma3ana project.

## Directory Structure

```
scripts/
├── import/              # Data import and migration scripts
├── verification/        # Data validation and verification
├── cleanup/             # Data cleanup and deduplication
├── backfill/            # Data backfilling scripts
├── admin/               # Admin user and role management
├── utilities/           # General utility scripts
├── setup/               # Infrastructure setup scripts
├── maintenance/         # Ongoing maintenance tasks
├── i18n/                # Internationalization scripts
└── Archived/            # Deprecated scripts
```

## Script Categories

### Import Scripts (`import/`)

Data import and migration scripts:

- **00-run-full-import.js** - Master script (runs all import steps)
- **01-clear-all-data.js** - Clear all cases, contributions, notifications
- **02-import-contributions-with-users.js** - Main import script
- **03-verify-import.js** - Verify import results

**Usage:**
```bash
# Full import (recommended)
node scripts/import/00-run-full-import.js

# Or step by step
node scripts/import/01-clear-all-data.js
node scripts/import/02-import-contributions-with-users.js
node scripts/import/03-verify-import.js
```

### Verification Scripts (`verification/`)

Data validation and verification:

- **10-check-extra-contributions.js** - Find contributions not in CSV
- **11-check-contribution-totals.js** - Compare CSV vs database totals
- **12-check-duplicate-contributions.js** - Find duplicate contributions

**Usage:**
```bash
# Check totals
node scripts/verification/11-check-contribution-totals.js

# Check for duplicates
node scripts/verification/12-check-duplicate-contributions.js

# Check for extra contributions
node scripts/verification/10-check-extra-contributions.js
```

### Cleanup Scripts (`cleanup/`)

Data cleanup and deduplication:

- **20-remove-duplicate-contributions.js** - Remove duplicate contributions
- **replace-console-logs.js** - Replace console statements with logger

**Usage:**
```bash
# Remove duplicates
node scripts/cleanup/20-remove-duplicate-contributions.js
```

### Backfill Scripts (`backfill/`)

Data backfilling:

- **30-backfill-contribution-notifications.js** - Backfill all contribution notifications
- **31-backfill-donor-pending-notifications.js** - Backfill donor pending notifications

**Usage:**
```bash
# Backfill notifications
node scripts/backfill/30-backfill-contribution-notifications.js
node scripts/backfill/31-backfill-donor-pending-notifications.js
```

### Admin Scripts (`admin/`)

Admin user and role management:

- **40-assign-donor-role-to-all.js** - Assign 'donor' role to all users
- **41-assign-super-admin.js** - Assign super admin role to a user
- **70-admin-create-user.js** - Create admin user
- **71-admin-add-user.js** - Add user to system
- **72-admin-seed-data.js** - Seed initial data

**Usage:**
```bash
# Assign roles
node scripts/admin/40-assign-donor-role-to-all.js
node scripts/admin/41-assign-super-admin.js --email=user@example.com

# Admin user management
node scripts/admin/70-admin-create-user.js
node scripts/admin/71-admin-add-user.js
node scripts/admin/72-admin-seed-data.js
```

### Utility Scripts (`utilities/`)

General utility scripts:

- **50-utility-merge-contributors.js** - Merge contributor accounts
- **51-utility-recalculate-case-amounts.js** - Recalculate case amounts

**Usage:**
```bash
# Merge contributors
node scripts/utilities/50-utility-merge-contributors.js --from=<userId> --to=<userId>

# Recalculate case amounts
node scripts/utilities/51-utility-recalculate-case-amounts.js
```

### Setup Scripts (`setup/`)

Infrastructure setup:

- **60-setup-storage-buckets.js** - Setup storage buckets
- **61-add-cases-menu-items.js** - Add cases menu items
- **61-create-beneficiaries-bucket.js** - Create beneficiaries bucket
- **62-verify-beneficiaries-bucket.js** - Verify beneficiaries bucket
- **63-verify-beneficiary-documents-rls.js** - Verify beneficiary documents RLS
- **setup-env.js** - Setup environment variables
- **setup-admin-system.sh** - Setup admin system (shell script)

**Usage:**
```bash
# Setup environment
node scripts/setup/setup-env.js

# Setup storage
node scripts/setup/60-setup-storage-buckets.js
node scripts/setup/61-create-beneficiaries-bucket.js
node scripts/setup/62-verify-beneficiaries-bucket.js
```

### Maintenance Scripts (`maintenance/`)

Ongoing maintenance tasks:

- **80-update-user-email-domains.js** - Update user email domains

**Usage:**
```bash
node scripts/maintenance/80-update-user-email-domains.js
```

### Internationalization (`i18n/`)

Internationalization scripts:

- **find-unused-keys.js** - Find unused translation keys
- **sync-i18n.js** - Sync translations
- **validate-i18n.js** - Validate translations

**Usage:**
```bash
npm run i18n:validate
npm run i18n:sync
npm run i18n:unused
```

## Other Scripts

- **dev.js** - Task Master CLI (AI-driven development task management)
- **apply-email-templates.js** - Apply email templates
- **test-activity-logging.js** - Test activity logging
- **test-user-merge.js** - Test user merge functionality
- **update-pages-layout.js** - Update pages layout

## Environment Requirements

All scripts require `.env.local` or `.env` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (for database operations)

## Notes

- All scripts use ES modules (import/export syntax)
- Numbered prefixes are preserved for backward compatibility
- Scripts are organized by purpose for better maintainability
- See `docs/cases/IMPORT_GUIDE.md` for complete import documentation

## Migration Notes

Scripts have been reorganized from a flat structure to a categorized structure. The numbered prefixes are preserved, so scripts can still be referenced by their original names if needed. Update any CI/CD pipelines or documentation that reference script paths.
