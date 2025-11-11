# Quick Start: Import Contributions

## Before You Start

1. **Update CSV File**:
   - Open `docs/cases/contributions.csv`
   - Change all `ContributorID = 0` to `ContributorID = 100`
   - Save the file

2. **Verify Environment**:
   ```bash
   # Check .env.local exists and has required variables
   cat .env.local | grep SUPABASE
   ```

## Run Import (Choose One Method)

### Method 1: Individual Scripts (Recommended)

```bash
# Step 1: Clear all data
node scripts/01-clear-all-data.js

# Step 2: Import contributions
node scripts/02-import-contributions-with-users.js

# Step 3: Verify import
node scripts/03-verify-import.js
```

### Method 2: Master Script

```bash
# Runs all steps automatically
node scripts/00-run-full-import.js
```

## Expected Results

- ✅ 535 contributions imported
- ✅ Total: 1,207,920 EGP
- ✅ All users created (including ContributorID = 100)
- ✅ All notifications created (1070 total)
- ✅ All approval statuses created

## Troubleshooting

If totals don't match:
```bash
node scripts/check-contribution-totals.js
node scripts/check-duplicate-contributions.js
```

If users missing donor role:
```bash
node scripts/assign-donor-role-to-all.js
```

## Documentation

- Full guide: `docs/cases/IMPORT_README.md`
- Migration plan: `docs/cases/IMPORT_MIGRATION_PLAN.md`
- Scripts overview: `docs/cases/SCRIPTS_ORGANIZATION.md`
