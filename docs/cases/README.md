# Contribution Import System

This directory contains documentation and data files for importing contributions from CSV into the database.

## Quick Links

- **[Quick Start Guide](QUICK_START.md)** - Get started quickly
- **[Complete Import Guide](IMPORT_GUIDE.md)** - Full documentation
- **[Migration Plan](IMPORT_MIGRATION_PLAN.md)** - Step-by-step migration instructions
- **[Notification Fix](NOTIFICATION_FIX.md)** - Notification system documentation

## Files

- **`contributions.csv`** - Source data file for import
- **`IMPORT_GUIDE.md`** - Complete import system documentation
- **`QUICK_START.md`** - Quick reference guide
- **`IMPORT_MIGRATION_PLAN.md`** - Detailed migration plan
- **`NOTIFICATION_FIX.md`** - Notification system fixes

## Import Scripts

All import scripts are located in `scripts/` directory:

- `00-run-full-import.js` - Master script (runs all steps)
- `01-clear-all-data.js` - Clear existing data
- `02-import-contributions-with-users.js` - Main import script
- `03-verify-import.js` - Verification script

See [IMPORT_GUIDE.md](IMPORT_GUIDE.md) for complete documentation.
