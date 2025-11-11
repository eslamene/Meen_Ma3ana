# Comprehensive Guide: Import Contributions with User Accounts

This guide walks you through the complete process of deleting existing data and importing fresh contributions with proper user accounts.

## 📋 Prerequisites

Before starting, ensure you have:

1. **Environment Variables** set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **CSV File** ready:
   - Location: `docs/cases/contributions.csv`
   - Required columns: `ID`, `Description`, `Contributor`, `ContributorID`, `Amount`, `Month`

3. **Database Access**:
   - Supabase project access
   - Service role key (for admin operations)

4. **Backup** (recommended):
   - Export current data if you need to keep it
   - Or ensure you have a database backup

## 🚀 Step-by-Step Process

### Step 1: Backup Current Data (Optional but Recommended)

If you want to keep a copy of current data:

```bash
# Option A: Export via Supabase Dashboard
# 1. Go to Supabase Dashboard > Table Editor
# 2. Export tables: cases, contributions, notifications, users
# 3. Save exports locally

# Option B: Use pg_dump (if you have direct database access)
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Verify CSV File

Check that your CSV file is ready:

```bash
# Check CSV file exists
ls -lh docs/cases/contributions.csv

# Preview first few lines
head -5 docs/cases/contributions.csv

# Count total lines
wc -l docs/cases/contributions.csv
```

**Expected CSV format:**
```
ID,Description,Contributor,ContributorID,Amount,Month
56,تلاجه بنت عامله النضافه,Muna,83,1000,01/09/2025
33,تلاجه تبع وسام الست جوزها احتياجات خاصه,Tc,2,1000,01/08/2025
```

### Step 3: Verify Environment Variables

Make sure environment variables are set:

```bash
# Check if .env.local exists
ls -la .env.local

# Verify variables are set (don't show values for security)
grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "✓ SUPABASE_URL set" || echo "✗ SUPABASE_URL missing"
grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && echo "✓ SERVICE_ROLE_KEY set" || echo "✗ SERVICE_ROLE_KEY missing"
```

### Step 4: Verify Database State

Check current data before deletion:

```bash
# Option A: Check via Supabase Dashboard
# Go to Table Editor and note:
# - Number of cases
# - Number of contributions
# - Number of users

# Option B: Use SQL (if you have psql access)
psql "$DATABASE_URL" -c "SELECT COUNT(*) as cases FROM cases;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as contributions FROM contributions;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as users FROM users WHERE role = 'donor';"
```

### Step 5: Run the Import Script

The script will automatically:
1. ✅ Delete all existing cases, contributions, and notifications
2. ✅ Create user accounts for each unique ContributorID
3. ✅ Create cases from CSV
4. ✅ Create contributions linked to proper users
5. ✅ Create approval statuses
6. ✅ Update case amounts

```bash
# From project root directory
node scripts/import-contributions-with-users.js
```

**Expected output:**
```
🚀 Starting contribution import with user accounts (by ContributorID)...

🗑️  Clearing all cases, contributions, and notifications...
   ✓ Cleared notifications
   ✓ Cleared contribution approval statuses
   ✓ Cleared contributions
   ✓ Cleared cases and related data

✅ All data cleared successfully!

📊 Parsing CSV data...
📋 Found 158 unique cases
👥 Found 87 unique contributors (by ContributorID)

👤 Creating user accounts for contributors...
   Creating account for ContributorID 1: أنا
   ✓ Created auth user: contributor0001@contributor.meenma3ana.local
   ✓ Created app user record: أنا (ID: 1)
   ...

✅ Created 87 new user accounts

📂 Fetching case categories...
💳 Fetching payment methods...
📝 Creating cases...
✅ Created 158 cases

💰 Creating contributions...
   ✓ Inserted batch 1 (100/536 contributions)
   ✓ Inserted batch 2 (200/536 contributions)
   ...
✅ Created 536 contributions

✅ Creating approval statuses...
✅ Created 536 approval statuses

📊 Updating case amounts...
✅ Updated case amounts

============================================================
📊 IMPORT SUMMARY
============================================================
✅ Created 87 user accounts (by ContributorID)
✅ Created 158 cases
✅ Created 536 contributions
✅ Created 536 approval statuses

💡 All contributors can now:
   - Login using their email (format: contributor<ContributorID>@contributor.meenma3ana.local)
   - Reset their password using the "Forgot Password" feature
   - Admin can modify their profiles in the admin panel
   - Each ContributorID has exactly one user account (no duplicates)
   - All emails are ASCII-only (no Arabic characters)
============================================================

✨ Import completed successfully!
```

### Step 6: Verify Import Results

After the script completes, verify the data:

```bash
# Option A: Check via Supabase Dashboard
# Go to Table Editor and verify:
# - Cases table has expected number of cases
# - Contributions table has expected number of contributions
# - Users table has expected number of donor accounts

# Option B: Use SQL queries
psql "$DATABASE_URL" << EOF
-- Check cases
SELECT COUNT(*) as total_cases FROM cases;
SELECT COUNT(*) as published_cases FROM cases WHERE status = 'published';

-- Check contributions
SELECT COUNT(*) as total_contributions FROM contributions;
SELECT COUNT(*) as approved_contributions FROM contributions WHERE status = 'approved';
SELECT SUM(amount::numeric) as total_amount FROM contributions;

-- Check users
SELECT COUNT(*) as total_donors FROM users WHERE role = 'donor';
SELECT COUNT(*) as verified_users FROM users WHERE email_verified = true;

-- Check unique contributors
SELECT COUNT(DISTINCT donor_id) as unique_contributors FROM contributions;
EOF
```

### Step 7: Test User Login

Test that contributors can login:

1. **Get a contributor email** from the import output or database:
   ```sql
   SELECT email, first_name FROM users WHERE role = 'donor' LIMIT 5;
   ```

2. **Test password reset**:
   - Go to login page
   - Click "Forgot Password"
   - Enter contributor email (e.g., `contributor0001@contributor.meenma3ana.local`)
   - Check email for reset link
   - Set new password
   - Login with new password

3. **Verify contributor can see their contributions**:
   - Login as contributor
   - Check dashboard shows their contributions
   - Verify contribution history is correct

## 🔍 Troubleshooting

### Issue: Script fails with "Missing environment variables"

**Solution:**
```bash
# Check .env.local exists
ls -la .env.local

# Verify variables are set
cat .env.local | grep -E "(SUPABASE_URL|SERVICE_ROLE_KEY)"

# If missing, add them:
echo "NEXT_PUBLIC_SUPABASE_URL=your_url" >> .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=your_key" >> .env.local
```

### Issue: Script fails with "CSV file not found"

**Solution:**
```bash
# Check file exists
ls -la docs/cases/contributions.csv

# Verify path is correct (from project root)
pwd
# Should be: /path/to/Meen_Ma3ana
```

### Issue: Script fails with "No payment methods found"

**Solution:**
```sql
-- Check payment methods exist
SELECT * FROM payment_methods WHERE is_active = true;

-- If none exist, create one:
INSERT INTO payment_methods (code, name, description, is_active, sort_order)
VALUES ('cash', 'Cash', 'Cash payment', true, 1);
```

### Issue: Script fails with "No admin user found"

**Solution:**
```sql
-- Check admin users exist
SELECT * FROM users WHERE role = 'admin';

-- If none exist, create one first:
-- Use scripts/create-admin-user.js or create manually
```

### Issue: Some contributions not imported

**Check:**
```bash
# Review script output for warnings
# Look for lines like:
# "⚠️  Skipping contribution with ContributorID X"

# Common reasons:
# - ContributorID <= 0 (unknown contributors)
# - Invalid ContributorID (non-numeric)
# - Missing contributor name
```

### Issue: Duplicate user accounts created

**Solution:**
Use the merge script to consolidate:
```bash
# Find duplicates
node scripts/merge-contributors.js --list-duplicates

# Merge duplicates
node scripts/merge-contributors.js --merge-by-name --confirm
```

## 📊 Post-Import Checklist

After successful import, verify:

- [ ] All cases created successfully
- [ ] All contributions linked to correct users
- [ ] Case amounts match contribution totals
- [ ] All users have valid email addresses (ASCII-only)
- [ ] All users can reset passwords
- [ ] Approval statuses created for all contributions
- [ ] No duplicate user accounts (one per ContributorID)
- [ ] Contributors can login and see their contributions

## 🔄 Rollback (If Needed)

If something goes wrong and you need to rollback:

1. **Restore from backup** (if you created one):
   ```bash
   psql "$DATABASE_URL" < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Or clear everything and start fresh**:
   ```bash
   # The import script clears everything automatically
   # Just run it again with corrected CSV
   node scripts/import-contributions-with-users.js
   ```

## 📝 Quick Reference

**Full import command:**
```bash
node scripts/import-contributions-with-users.js
```

**Check current data:**
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM cases; SELECT COUNT(*) FROM contributions; SELECT COUNT(*) FROM users WHERE role = 'donor';"
```

**Find contributor email:**
```sql
SELECT email, first_name, id FROM users WHERE role = 'donor' ORDER BY email LIMIT 10;
```

**Check import status:**
```sql
SELECT 
  (SELECT COUNT(*) FROM cases) as cases,
  (SELECT COUNT(*) FROM contributions) as contributions,
  (SELECT COUNT(*) FROM users WHERE role = 'donor') as donors,
  (SELECT COUNT(*) FROM contribution_approval_status) as approvals;
```

## ⚠️ Important Notes

1. **The script DELETES all existing cases and contributions** - make sure you have a backup if needed
2. **Contributions with ContributorID <= 0 are skipped** - these are "unknown" contributors
3. **All emails are ASCII-only** - format: `contributor<ID>@contributor.meenma3ana.local`
4. **One user per ContributorID** - ensures no duplicates
5. **Case amounts are auto-calculated** - based on approved contributions

## 🆘 Need Help?

If you encounter issues:
1. Check the script output for error messages
2. Review the troubleshooting section above
3. Verify CSV format matches expected structure
4. Check database permissions (service role key)
5. Review Supabase logs for detailed errors

