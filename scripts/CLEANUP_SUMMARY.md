# Scripts Directory Cleanup Summary

**Date:** 2025-12-31

## Cleanup Actions Taken

### 1. Archived One-Time Use Scripts

Moved to `scripts/Archived/one-time-use/`:
- **Test scripts:** `test-activity-logging.js`, `test-push-on-complete.js`, `test-user-merge.js`, `check-push-notifications.js`, `force-cleanup-service-workers.js`
- **Import scripts:** All scripts from `import/` directory (data import was a one-time operation)
- **Backfill scripts:** All scripts from `backfill/` directory (one-time data backfilling)
- **Verification scripts:** All scripts from `verification/` directory (one-time verification)
- **Cleanup scripts:** `cleanup/20-remove-duplicate-contributions.js`, `cleanup/replace-console-logs.js`, `cleanup/audit-database-schema.js`
- **Setup scripts:** `setup/61-add-cases-menu-items.js`, `setup/61-create-beneficiaries-bucket.js`, `setup/62-verify-beneficiaries-bucket.js`, `setup/63-verify-beneficiary-documents-rls.js`
- **Admin scripts:** `admin/40-assign-donor-role-to-all.js`, `admin/41-assign-super-admin.js`

### 2. Archived Temporary Documentation

Moved to `scripts/Archived/temporary-docs/`:
- `manual-cleanup-guide.md` - Temporary service worker cleanup guide
- `cleanup-service-workers.md` - Service worker cleanup instructions
- `test-case-status-notification.md` - Test documentation
- `test-fcm.md` - FCM test documentation
- `check-edge-function.md` - Edge function check guide
- `setup-v1-api-secrets.md` - One-time setup guide
- `setup-edge-function-secrets.md` - One-time setup guide
- `README_61_add_cases_menu.md` - Setup documentation

### 3. Archived SQL Check Files

Moved to `scripts/Archived/sql-checks/`:
- `apply-fcm-migration.sql` - Already applied migration
- `check-fcm-rls.sql` - One-time RLS check
- `check-fcm-setup.sql` - One-time setup check
- `debug-case-status-notifications.sql` - Debug script
- `fix-home-nav-link.sql` - One-time fix

### 4. Cleaned Temporary Files

- Removed `.DS_Store` files (macOS system files)
- Removed `.old` cache files from `.next/cache/`

## Remaining Active Scripts

The following scripts remain active and are regularly used:

### Admin Scripts (`admin/`)
- `70-admin-create-user.js` - Create admin users
- `71-admin-add-user.js` - Add users to system
- `72-admin-seed-data.js` - Seed initial data

### Setup Scripts (`setup/`)
- `60-setup-storage-buckets.js` - Setup storage buckets (may need to run again)
- `setup-env.js` - Setup environment variables
- `setup-admin-system.sh` - Setup admin system

### Maintenance Scripts (`maintenance/`)
- `80-update-user-email-domains.js` - Update user email domains

### Utility Scripts (`utilities/`)
- `50-utility-merge-contributors.js` - Merge contributor accounts
- `51-utility-recalculate-case-amounts.js` - Recalculate case amounts

### i18n Scripts (`i18n/`)
- `find-unused-keys.js` - Find unused translation keys
- `sync-i18n.js` - Sync translations
- `validate-i18n.js` - Validate translations

### Root Scripts
- `dev.js` - Task Master CLI
- `apply-email-templates.js` - Apply email templates
- `update-pages-layout.js` - Update pages layout
- `set-firebase-secret.sh` - Set Firebase secret

## Restoration

If you need any archived scripts, they can be found in `scripts/Archived/` and can be moved back if needed.

## Notes

- All archived scripts are preserved for historical reference
- Scripts can be safely deleted from `Archived/` if you're certain they won't be needed
- The cleanup maintains backward compatibility - no active functionality was removed

