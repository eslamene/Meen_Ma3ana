# Step 3: Migrate Existing Users - Instructions

## Migration Script Created

The migration script has been created at:
- `supabase/migrations/002_migrate_existing_users.sql`

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're connected to your Supabase project
supabase db push

# Then run the migration script
supabase db execute -f supabase/migrations/002_migrate_existing_users.sql
```

### Option 2: Using the Helper Script

```bash
./scripts/migrate-users.sh
```

### Option 3: Manual SQL Execution

1. Connect to your database using your preferred tool (pgAdmin, DBeaver, etc.)
2. Open `supabase/migrations/002_migrate_existing_users.sql`
3. Execute the SQL statements

## What the Migration Does

1. **Assigns 'donor' role to all existing users** - This gives all users basic access
2. **Provides verification queries** - Check how many users have been assigned roles
3. **Shows users without roles** - Identify any users that need manual assignment

## After Migration

1. **Review role assignments** - Check the verification queries to see current state
2. **Manually assign admin/moderator roles** - Update specific users as needed
3. **Test the system** - Verify users can access appropriate features

## Manual Role Assignment

To assign a specific role to a user:

```sql
INSERT INTO admin_user_roles (user_id, role_id, is_active)
SELECT 
    u.id,
    r.id,
    true
FROM auth.users u
CROSS JOIN admin_roles r
WHERE u.email = 'user@example.com'
AND r.name = 'admin'  -- or 'moderator', 'donor', etc.
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
```

## Verification

After running the migration, check:

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

