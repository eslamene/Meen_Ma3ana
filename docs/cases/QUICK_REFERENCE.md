# Quick Import Reference

## 🚀 One-Command Import

```bash
# From project root
node scripts/import-contributions-with-users.js
```

This single command will:
1. ✅ Delete all existing cases, contributions, notifications
2. ✅ Create user accounts for each unique ContributorID
3. ✅ Create cases from CSV
4. ✅ Create contributions linked to users
5. ✅ Create approval statuses
6. ✅ Update case amounts

## 📋 Pre-Flight Checklist

Before running the import:

- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `docs/cases/contributions.csv` exists
- [ ] CSV has columns: `ID`, `Description`, `Contributor`, `ContributorID`, `Amount`, `Month`
- [ ] Database backup created (optional but recommended)

## 🔍 Quick Verification

After import, verify:

```bash
# Check counts
psql "$DATABASE_URL" -c "
SELECT 
  (SELECT COUNT(*) FROM cases) as cases,
  (SELECT COUNT(*) FROM contributions) as contributions,
  (SELECT COUNT(*) FROM users WHERE role = 'donor') as donors;
"
```

## 📧 Contributor Emails

Format: `contributor<ContributorID>@contributor.meenma3ana.local`

Examples:
- ContributorID 1 → `contributor0001@contributor.meenma3ana.local`
- ContributorID 25 → `contributor0025@contributor.meenma3ana.local`
- ContributorID 83 → `contributor0083@contributor.meenma3ana.local`

## 🆘 Common Issues

**Missing env vars:**
```bash
# Check
grep -q "SUPABASE" .env.local && echo "✓ Set" || echo "✗ Missing"
```

**CSV not found:**
```bash
# Check
ls -lh docs/cases/contributions.csv
```

**No payment methods:**
```sql
-- Create one
INSERT INTO payment_methods (code, name, is_active) 
VALUES ('cash', 'Cash', true);
```

## 📚 Full Documentation

- **Step-by-step guide**: `docs/cases/IMPORT_STEPS.md`
- **Script details**: `docs/cases/IMPORT_WITH_USERS_README.md`
- **Summary**: `docs/cases/IMPORT_SUMMARY.md`

