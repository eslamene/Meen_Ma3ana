# 🔧 Quick Fix: Database Error Creating New User

## The Problem

You're seeing `Database error creating new user` (status 500) when running the import script. This happens because the database trigger is failing.

## ✅ The Solution (Manual - Required)

**You MUST apply the trigger fix manually via Supabase Dashboard** because direct `psql` connections don't work with Supabase's pooler.

### Step 1: Apply Trigger Fix

1. **Go to:** [Supabase Dashboard](https://app.supabase.com) > Your Project > SQL Editor

2. **Copy this SQL:**

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
            -- The trigger will complete successfully even if role assignment fails
            RAISE WARNING 'Failed to assign donor role to user %: %', NEW.id, SQLERRM;
        END;
    ELSE
        -- Log warning if donor role doesn't exist
        RAISE WARNING 'Donor role not found - cannot assign role to user %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Paste and Run** the SQL in the SQL Editor

4. **Verify** you see: `Success. No rows returned`

### Step 2: Run Import Script

After applying the trigger fix, run:

```bash
node scripts/import-contributions-with-users.js
```

The import should now work! ✅

## What This Fix Does

- **Before:** If the trigger failed (e.g., role assignment error), the entire user creation would fail
- **After:** The trigger catches errors, logs warnings, but allows user creation to succeed

## Verify It Worked

After running the import, check in Supabase Dashboard:

```sql
-- Check users were created
SELECT COUNT(*) FROM users WHERE role = 'donor';

-- Check roles were assigned
SELECT COUNT(*) FROM admin_user_roles WHERE is_active = true;
```

## If Some Users Were Created But Roles Weren't Assigned

Run this SQL in Supabase Dashboard > SQL Editor:

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

## Quick Reference

**Apply fix:** Supabase Dashboard > SQL Editor > Run SQL above  
**Run import:** `node scripts/import-contributions-with-users.js`  
**Assign roles:** Supabase Dashboard > SQL Editor > Run "If Some Users" SQL above
