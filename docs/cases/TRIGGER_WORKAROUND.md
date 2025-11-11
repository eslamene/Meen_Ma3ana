# Fixed: Trigger Workaround (No Permission Required)

Since we can't disable triggers on `auth.users` (permission denied), this script fixes the trigger function to handle errors gracefully instead.

## The Solution

Instead of disabling the trigger (which requires owner permissions), we:
1. **Fix the trigger function** to catch errors and not fail user creation
2. Run the import script
3. Manually assign donor roles

## Quick Usage

```bash
# Make sure DATABASE_URL is in .env.local
node scripts/import-with-trigger-disabled.js
```

## What Changed

The trigger function now uses `EXCEPTION WHEN OTHERS` to catch any errors during role assignment. If the role assignment fails, it logs a warning but **doesn't fail the user creation**.

## Manual Alternative (Via Supabase Dashboard)

If you prefer to do it manually:

### Step 1: Fix the Trigger Function

Go to Supabase Dashboard > SQL Editor and run:

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
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to assign donor role to user %: %', NEW.id, SQLERRM;
        END;
    ELSE
        RAISE WARNING 'Donor role not found - cannot assign role to user %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Run Import

```bash
node scripts/import-contributions-with-users.js
```

### Step 3: Assign Donor Roles

Run this SQL in Supabase Dashboard:

```sql
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

## Why This Works

The updated trigger function:
- ✅ Catches errors with `EXCEPTION WHEN OTHERS`
- ✅ Logs warnings instead of failing
- ✅ Returns `NEW` successfully even if role assignment fails
- ✅ Allows user creation to complete

This way, even if the trigger encounters an error, the user is still created successfully.

## Migration File

A migration file has been created: `supabase/migrations/032_fix_donor_role_trigger.sql`

You can apply it via:
- Supabase Dashboard > SQL Editor (copy/paste the SQL)
- Or it will be applied automatically on next migration run
