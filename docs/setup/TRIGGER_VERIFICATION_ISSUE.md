# Database Trigger Verification Issue

## The Problem

Even with a real email and direct click, Supabase verification is failing with `unexpected_failure`. The Supabase log shows a 303 redirect, but our callback receives error parameters.

## Potential Root Cause: Database Trigger Failure

The `sync_email_verified()` trigger runs when `email_confirmed_at` is set in `auth.users`. This trigger tries to UPDATE the `users` table. If this fails, it might cause Supabase to fail the verification.

### The Trigger Chain

1. User clicks verification link
2. Supabase verifies PKCE token
3. Supabase sets `email_confirmed_at` in `auth.users`
4. **Trigger fires:** `sync_email_verified_trigger` runs
5. **Trigger tries to:** UPDATE `users` table SET `email_verified = true`
6. **If this fails:** Could cause verification to fail

## Potential Issues

### Issue 1: Users Table Row Doesn't Exist

If the `users` table row wasn't created during signup, the trigger's UPDATE will affect 0 rows. This shouldn't cause an error, but could indicate a problem.

**Check:**
```sql
-- In Supabase SQL Editor, check if user exists in users table
SELECT id, email, email_verified 
FROM users 
WHERE id = '<user-id-from-auth-users>';
```

### Issue 2: RLS Policy Blocking Trigger

If RLS policies on the `users` table block the trigger's UPDATE, it could fail.

**Check:**
```sql
-- Check RLS policies on users table
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue 3: Trigger Error Not Handled

If the trigger throws an error, it could cause Supabase to fail the verification.

**Check Supabase Postgres Logs:**
1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Filter for time around verification (e.g., `2025-11-24 19:05:43`)
3. Look for errors from `sync_email_verified()` function

## Diagnostic Steps

### Step 1: Check if User Exists in Users Table

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user who tried to verify
3. Note their user ID
4. Go to Supabase Dashboard → Table Editor → `users` table
5. Search for that user ID
6. **If user doesn't exist:** This is the problem - the trigger can't update a non-existent row

### Step 2: Check Postgres Logs for Trigger Errors

1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Filter for time around verification attempt
3. Look for errors mentioning:
   - `sync_email_verified`
   - `users` table
   - `UPDATE` errors
   - `RLS` policy violations

### Step 3: Test Trigger Manually

```sql
-- In Supabase SQL Editor, test the trigger manually
-- Replace '<user-id>' with actual user ID from auth.users

-- First, check if user exists
SELECT id, email, email_verified FROM users WHERE id = '<user-id>';

-- If user doesn't exist, create it
INSERT INTO users (id, email, email_verified, role)
VALUES ('<user-id>', 'test@example.com', false, 'donor')
ON CONFLICT (id) DO NOTHING;

-- Then manually trigger the sync (simulate what happens during verification)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE id = '<user-id>';

-- Check if users table was updated
SELECT id, email, email_verified FROM users WHERE id = '<user-id>';
```

## Solutions

### Solution 1: Ensure Users Table Row Exists Before Verification

Modify the signup process to ensure the `users` table row is created immediately after signup, not during verification.

**Current flow:**
1. Signup → `auth.users` row created
2. Verification → `email_confirmed_at` set → Trigger tries to update `users` table

**Better flow:**
1. Signup → `auth.users` row created → `users` table row created immediately
2. Verification → `email_confirmed_at` set → Trigger updates existing `users` row

### Solution 2: Make Trigger More Resilient

Modify the trigger to handle the case where the `users` row doesn't exist:

```sql
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email_verified in users table when email_confirmed_at changes
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    -- Use INSERT ... ON CONFLICT to ensure row exists
    INSERT INTO users (id, email, email_verified, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, true, 'donor', NOW(), NOW())
    ON CONFLICT (id) 
    DO UPDATE SET 
      email_verified = true,
      updated_at = NOW();
  ELSIF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NOT NULL THEN
    UPDATE users
    SET email_verified = false,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 3: Check RLS Policies

Ensure RLS policies allow the trigger to update the `users` table:

```sql
-- Check current RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- If needed, create a policy that allows the trigger to update
-- (SECURITY DEFINER functions should bypass RLS, but verify)
```

## Next Steps

1. **Check if user exists in users table** - This is the most likely issue
2. **Check Postgres logs** for trigger errors
3. **If user doesn't exist:** Ensure users table row is created during signup
4. **If trigger is failing:** Make it more resilient with INSERT ... ON CONFLICT

