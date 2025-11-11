# Troubleshooting: Database Error Creating New User

If you're seeing "Database error creating new user" (status 500) errors, this guide will help you diagnose and fix the issue.

## Common Causes

### 1. Missing Donor Role

The database trigger `assign_donor_role_to_new_user` requires a 'donor' role in the `admin_roles` table.

**Check:**
```sql
SELECT * FROM admin_roles WHERE name = 'donor' AND is_active = true;
```

**Fix:**
```sql
INSERT INTO admin_roles (name, display_name, display_name_ar, description, description_ar, level, is_system) 
VALUES ('donor', 'Donor', 'متبرع', 'Can make contributions', 'يمكنه التبرع', 1, true)
ON CONFLICT (name) DO NOTHING;
```

### 2. Trigger Function Error

The trigger function might be failing due to a constraint or permission issue.

**Check trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_assign_donor_role_on_user_create';
```

**Check trigger function:**
```sql
SELECT proname, prosrc FROM pg_proc WHERE proname = 'assign_donor_role_to_new_user';
```

**View recent errors in Supabase:**
1. Go to Supabase Dashboard > Logs > Postgres Logs
2. Look for errors around the time of user creation
3. Check for constraint violations or permission errors

### 3. RLS Policy Blocking Trigger

Even though the trigger uses `SECURITY DEFINER`, there might be RLS policies blocking inserts.

**Check RLS on admin_user_roles:**
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_user_roles';
```

### 4. Foreign Key Constraint

The `admin_user_roles` table has foreign keys that might be failing.

**Check constraints:**
```sql
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'admin_user_roles';
```

## Quick Fixes

### Option 1: Temporarily Disable Trigger

If the trigger is causing issues, you can temporarily disable it:

```sql
-- Disable trigger
ALTER TABLE auth.users DISABLE TRIGGER trigger_assign_donor_role_on_user_create;

-- Run your import script
-- node scripts/import-contributions-with-users.js

-- Re-enable trigger
ALTER TABLE auth.users ENABLE TRIGGER trigger_assign_donor_role_on_user_create;

-- Manually assign donor role to imported users
INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
SELECT 
    u.id as user_id,
    r.id as role_id,
    true as is_active,
    NOW() as assigned_at
FROM users u
CROSS JOIN admin_roles r
WHERE r.name = 'donor'
AND r.is_active = true
AND u.role = 'donor'
AND NOT EXISTS (
    SELECT 1 FROM admin_user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);
```

### Option 2: Make Trigger More Resilient

Update the trigger function to handle errors gracefully:

```sql
CREATE OR REPLACE FUNCTION assign_donor_role_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    donor_role_id UUID;
BEGIN
    -- Get the donor role ID
    SELECT id INTO donor_role_id
    FROM admin_roles
    WHERE name = 'donor'
    AND is_active = true
    LIMIT 1;

    -- If donor role exists, assign it to the new user
    IF donor_role_id IS NOT NULL THEN
        BEGIN
            INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
            VALUES (NEW.id, donor_role_id, true, NOW())
            ON CONFLICT (user_id, role_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail user creation
            RAISE WARNING 'Failed to assign donor role to user %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 3: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs > Postgres Logs
3. Filter by time when errors occurred
4. Look for detailed error messages
5. Common errors:
   - `foreign key constraint violation`
   - `permission denied`
   - `relation does not exist`
   - `unique constraint violation`

## Verification Steps

After fixing, verify everything works:

```sql
-- 1. Check donor role exists
SELECT * FROM admin_roles WHERE name = 'donor';

-- 2. Check trigger is enabled
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgname = 'trigger_assign_donor_role_on_user_create';

-- 3. Test creating a user manually
-- Use Supabase Dashboard > Authentication > Add User
-- Check if trigger assigns donor role

-- 4. Check admin_user_roles table
SELECT COUNT(*) FROM admin_user_roles WHERE is_active = true;
```

## Script Improvements

The import script now:
- ✅ Checks if donor role exists before starting
- ✅ Uses upsert for users table (handles conflicts)
- ✅ Checks if user was created despite error (for 500 errors)
- ✅ Retries with exponential backoff
- ✅ Continues processing even if some users fail

## If All Else Fails

1. **Check Supabase Status**: https://status.supabase.com
2. **Contact Supabase Support**: Include error logs and timestamps
3. **Use Alternative Method**: Create users via Supabase Dashboard manually, then import contributions

## Related Files

- Trigger definition: `supabase/migrations/018_assign_permissions_to_superadmin_and_auto_assign_donor.sql`
- Admin roles setup: `supabase/migrations/000_complete_admin_setup.sql`
- Import script: `scripts/import-contributions-with-users.js`

