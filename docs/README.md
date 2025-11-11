# Documentation Structure

## Contribution Import System

All documentation for importing contributions is in `docs/cases/`:

- **[README.md](cases/README.md)** - Overview and quick links
- **[IMPORT_GUIDE.md](cases/IMPORT_GUIDE.md)** - Complete import system documentation
- **[QUICK_START.md](cases/QUICK_START.md)** - Quick reference guide
- **[IMPORT_MIGRATION_PLAN.md](cases/IMPORT_MIGRATION_PLAN.md)** - Step-by-step migration plan
- **[NOTIFICATION_FIX.md](cases/NOTIFICATION_FIX.md)** - Notification system documentation

## Setup & Deployment

- **[setup/](setup/)** - Setup documentation
  - `SETUP.md` - Main setup guide
  - `DATABASE_SETUP.md` - Database setup
  - `STORAGE_SETUP.md` - Storage setup
  - `QUICK_SETUP.md` - Quick setup reference

- **[deployment/](deployment/)** - Deployment documentation
  - `VERCEL_DEPLOYMENT.md` - Vercel deployment guide

## Project Documentation

- **[Meen-Ma3ana_BRD.md](Meen-Ma3ana_BRD.md)** - Business Requirements Document
- **[TECH_STACK_OVERVIEW.md](TECH_STACK_OVERVIEW.md)** - Technology stack overview

## Scripts

All scripts are in `scripts/` directory:

### Import Scripts (Run in Order)
- `00-run-full-import.js` - Master script
- `01-clear-all-data.js` - Clear existing data
- `02-import-contributions-with-users.js` - Main import
- `03-verify-import.js` - Verification

### Utility Scripts
- `check-*.js` - Check/verify scripts
- `remove-*.js` - Remove/cleanup scripts
- `backfill-*.js` - Backfill scripts
- `assign-*.js` - Role assignment scripts

See `docs/cases/IMPORT_GUIDE.md` for complete documentation.

