# Migration Plan: Complete Data Reimport

## Purpose
This document outlines the complete process for clearing and reimporting all contribution data from CSV, ensuring data integrity and proper integration with notifications.

## Prerequisites Checklist

- [ ] Backup current database (if needed)
- [ ] Verify CSV file is updated with ContributorID = 100 for unknown contributors
- [ ] Ensure environment variables are set in `.env.local`
- [ ] Verify database schema is up to date
- [ ] Confirm payment methods exist in database
- [ ] Confirm case categories exist
- [ ] Verify admin roles exist (including 'donor')

## Migration Steps

### Phase 1: Preparation

1. **Update CSV File**
   - Open `docs/cases/contributions.csv`
   - Change all `ContributorID = 0` to `ContributorID = 100`
   - Save the file
   - Verify CSV total matches expected (should be 1,207,920 EGP for 535 contributions)

2. **Verify Environment**
   ```bash
   # Check environment variables
   cat .env.local | grep SUPABASE
   ```

3. **Test Database Connection**
   ```bash
   node scripts/test-connection.js  # (if exists)
   ```

### Phase 2: Data Clearing

**Script**: `scripts/01-clear-all-data.js`

**What it does**:
- Deletes all notifications (contribution-related)
- Deletes all contribution_approval_status records
- Deletes all contributions
- Deletes all cases
- **Note**: User accounts are NOT deleted (they may be used elsewhere)

**Run**:
```bash
node scripts/01-clear-all-data.js
```

**Expected Output**:
```
🗑️  Clearing all data...
   ✓ Cleared notifications
   ✓ Cleared approval statuses
   ✓ Cleared contributions
   ✓ Cleared cases
✅ Data cleared successfully
```

### Phase 3: Data Import

**Script**: `scripts/02-import-contributions-with-users.js`

**What it does**:
1. Reads CSV file
2. Groups contributions by ContributorID
3. Creates Supabase Auth users for each unique ContributorID
4. Creates app user records
5. Groups contributions by Case ID
6. Creates cases
7. Creates contributions linked to users and cases
8. Creates approval statuses
9. Creates notifications (admin + donor)
10. Updates case amounts

**Run**:
```bash
node scripts/02-import-contributions-with-users.js
```

**Expected Output**:
```
📥 Starting import process...
👤 Creating user accounts...
   ✓ Created 83 user accounts
📝 Creating cases...
   ✓ Created 120 cases
💰 Creating contributions...
   ✓ Created 535 contributions
✅ Creating approval statuses...
   ✓ Created 535 approval statuses
📬 Creating notifications...
   ✓ Created 1070 notifications
📊 Updating case amounts...
   ✓ Updated case amounts

✅ Import completed successfully!
```

**Duration**: ~5-10 minutes (depending on number of users)

### Phase 4: Verification

**Script**: `scripts/03-verify-import.js`

**What it does**:
- Compares CSV totals with database totals
- Checks contribution counts
- Verifies notification counts
- Reports any discrepancies

**Run**:
```bash
node scripts/03-verify-import.js
```

**Expected Output**:
```
📊 Verification Report
   CSV Total: 1,207,920 EGP (535 contributions)
   DB Total: 1,207,920 EGP (535 contributions)
   ✅ Totals match!
   ✅ Notification count: 1070
```

### Phase 5: Post-Import Checks

1. **Verify User Count**
   ```bash
   # Check admin panel or run:
   node scripts/check-user-count.js  # (if exists)
   ```

2. **Verify Donor Roles**
   ```bash
   # If users don't have donor role:
   node scripts/40-assign-donor-role-to-all.js
   ```

3. **Check for Duplicates**
   ```bash
   node scripts/12-check-duplicate-contributions.js
   ```

4. **Verify Notifications**
   - Check admin panel notifications
   - Verify donor notifications exist

## Rollback Plan

If something goes wrong:

1. **Stop the import** (Ctrl+C)
2. **Check what was imported**:
   ```bash
   node scripts/11-check-contribution-totals.js
   ```
3. **Clear and restart**:
   ```bash
   node scripts/01-clear-all-data.js
   node scripts/02-import-contributions-with-users.js
   ```

## Common Issues & Solutions

### Issue 1: "Database error creating new user"
**Cause**: Trigger failure
**Solution**: Ensure migration `034_ultra_robust_trigger_fix.sql` is applied

### Issue 2: "User already exists"
**Cause**: Previous import left users
**Solution**: Script handles this automatically, but you can clear users manually if needed

### Issue 3: "CSV parsing error"
**Cause**: Invalid CSV format
**Solution**: Check CSV file, ensure proper encoding (UTF-8)

### Issue 4: "Missing payment method"
**Cause**: Database not set up
**Solution**: Run database migrations first

### Issue 5: "Total doesn't match"
**Cause**: Duplicate contributions or CSV parsing issue
**Solution**: 
1. Run `scripts/11-check-contribution-totals.js` to identify discrepancy
2. Run `scripts/12-check-duplicate-contributions.js` to find duplicates
3. Run `scripts/20-remove-duplicate-contributions.js` if needed

## Success Criteria

- [ ] All 535 contributions imported
- [ ] Total amount matches CSV (1,207,920 EGP)
- [ ] All users created successfully
- [ ] All cases created successfully
- [ ] All approval statuses created
- [ ] All notifications created (1070 total)
- [ ] No duplicate contributions
- [ ] All users have 'donor' role

## Post-Migration Tasks

1. **Verify Dashboard**
   - Check landing page shows correct total
   - Verify contribution list displays correctly

2. **Test User Login**
   - Test password reset for a contributor
   - Verify they can see their contributions

3. **Verify Admin Panel**
   - Check all users are visible
   - Verify all contributions are listed
   - Check notifications are working

4. **Documentation**
   - Update any relevant documentation
   - Note any issues encountered

## Maintenance

### Regular Checks
- Run `scripts/11-check-contribution-totals.js` monthly to verify data integrity
- Check for duplicates quarterly
- Review notification counts

### Future Imports
- Follow the same process
- Always backup before clearing
- Verify CSV format matches expected structure
- Test with small dataset first

## Notes

- **User Accounts**: User accounts are NOT deleted during clear (only cases/contributions)
- **ContributorID 100**: This is now the standard for unknown contributors
- **Notifications**: Automatically created during import
- **Dates**: Preserved from CSV (DD/MM/YYYY format)
- **Email Format**: `contributor<ID>@contributor.meenma3ana.local`

## Contact

For issues or questions about the migration process, refer to:
- `docs/cases/IMPORT_README.md` - Detailed import documentation
- Script comments in individual files
- Database migration files in `supabase/migrations/`

