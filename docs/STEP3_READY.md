# Step 3 Migration - Ready to Apply

## ✅ Migration Script Created

The migration script is ready at:
- **File**: `supabase/migrations/002_migrate_existing_users.sql`
- **Helper Script**: `scripts/migrate-users.sh`

## 📋 What It Does

1. Assigns 'donor' role to all existing users in your database
2. Provides verification queries to check the results
3. Includes helper queries for manual role assignment

## 🚀 How to Apply

### Method 1: Using Supabase CLI (if available)

```bash
# First, make sure you've applied the base migration (001)
supabase db push

# Then run the user migration
supabase db execute -f supabase/migrations/002_migrate_existing_users.sql
```

### Method 2: Using the Helper Script

```bash
chmod +x scripts/migrate-users.sh
./scripts/migrate-users.sh
```

### Method 3: Manual Execution

1. Open your database management tool (pgAdmin, DBeaver, Supabase Dashboard, etc.)
2. Connect to your database
3. Open `supabase/migrations/002_migrate_existing_users.sql`
4. Execute the SQL statements

## ⚠️ Important Notes

- **Safe to run multiple times** - Uses `ON CONFLICT` to prevent duplicates
- **Only assigns 'donor' role by default** - You'll need to manually assign admin/moderator roles
- **Includes verification queries** - Run them to verify the migration worked

## 🔍 After Migration

Run these queries to verify:

```sql
-- See role distribution
SELECT 
    r.name as role_name,
    COUNT(ur.user_id) as user_count
FROM admin_roles r
LEFT JOIN admin_user_roles ur ON r.id = ur.role_id AND ur.is_active = true
GROUP BY r.name
ORDER BY r.level;
```

## 📝 Next Steps

After applying this migration:

1. ✅ Verify all users have the 'donor' role
2. ⏳ Manually assign admin/moderator roles to specific users
3. ⏳ Test the new admin system
4. ⏳ Update components to use new hooks (Step 4)

