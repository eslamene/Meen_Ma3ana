# FCM Tokens RLS Troubleshooting Guide

## Quick Check: Is RLS the Problem?

### Step 1: Check Server Logs

Look for error messages like:
- `new row violates row-level security policy`
- `permission denied for table fcm_tokens`
- `Database error [42501]: ...`

### Step 2: Verify Service Role Key

Check if `SUPABASE_SERVICE_ROLE_KEY` is set:

```bash
# In your terminal
grep SUPABASE_SERVICE_ROLE_KEY .env
```

Should output something like:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## How to Check RLS Policies

### Method 1: Using Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'fcm_tokens';

-- List all RLS policies
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'fcm_tokens'
ORDER BY policyname;
```

### Method 2: Using the Check Script

Run the provided SQL script:

```bash
# Copy the script to Supabase SQL Editor
cat scripts/check-fcm-rls.sql
```

## How to Fix RLS Issues

### Option 1: Use Service Role Key (Recommended)

The API route should **always** use the service role key to bypass RLS. This is already implemented in `src/app/api/push/fcm-subscribe/route.ts`.

**Verify it's working:**
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
2. The API route creates a service role client automatically
3. Service role key bypasses all RLS policies

### Option 2: Fix RLS Policies (If Service Role Not Available)

If you can't use service role key, apply the migration:

```bash
# Apply the migration
supabase migration up

# Or manually run in Supabase SQL Editor
# Copy contents of: supabase/migrations/1014_fix_fcm_tokens_rls.sql
```

### Option 3: Temporarily Disable RLS (Development Only)

**⚠️ WARNING: Only for development! Never do this in production!**

```sql
-- Disable RLS temporarily (DEVELOPMENT ONLY)
ALTER TABLE fcm_tokens DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
```

## Testing RLS Policies

### Test 1: Check if Service Role Can Insert

```sql
-- This should work if service role is used correctly
-- Run this with service role key in your API route
INSERT INTO fcm_tokens (user_id, fcm_token, platform, active)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'test-token-123',
  'web',
  true
);
```

### Test 2: Check Current User Policy

```sql
-- Check what auth.uid() returns for current session
SELECT auth.uid() as current_user_id;

-- Try to insert with current user
-- This should work if user is authenticated and policy allows it
INSERT INTO fcm_tokens (user_id, fcm_token, platform, active)
VALUES (
  auth.uid(),
  'test-token-456',
  'web',
  true
);
```

## Common RLS Issues and Solutions

### Issue 1: "new row violates row-level security policy"

**Cause**: RLS policy is blocking the insert

**Solution**:
1. Ensure API route uses service role key (already implemented)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
3. Check that service role client is created correctly

### Issue 2: "permission denied for table fcm_tokens"

**Cause**: User doesn't have permission or RLS is blocking

**Solution**:
1. Use service role key in API route (bypasses RLS)
2. Or ensure user is authenticated and policy allows insert

### Issue 3: Service Role Key Not Working

**Check**:
1. Verify key is correct: `grep SUPABASE_SERVICE_ROLE_KEY .env`
2. Check key format: Should start with `eyJ...`
3. Verify key hasn't expired
4. Check if key has `service_role` in the JWT payload

**Fix**:
1. Get new service role key from Supabase Dashboard
2. Update `.env` file
3. Restart development server

## Verification Steps

### Step 1: Check Environment Variable

```bash
# Should output the key
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Step 2: Test API Endpoint

```bash
# Test the endpoint (requires authentication)
curl -X POST http://localhost:3000/api/push/fcm-subscribe \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "fcmToken": "test-token-123",
    "deviceId": "device-123",
    "platform": "web"
  }'
```

### Step 3: Check Database

```sql
-- Should see the inserted token
SELECT * FROM fcm_tokens 
WHERE fcm_token = 'test-token-123';
```

## Current Implementation

The API route (`src/app/api/push/fcm-subscribe/route.ts`) now:
- ✅ Always uses service role key when available
- ✅ Bypasses RLS automatically (service role bypasses all policies)
- ✅ Provides clear error messages if service role key is missing
- ✅ Logs detailed error information for debugging

## If Still Having Issues

1. **Check server logs** for the actual error message
2. **Verify service role key** is set and correct
3. **Check Supabase Dashboard** > Settings > API > Service Role Key
4. **Test with SQL Editor** using service role key directly
5. **Check migration** was applied: `SELECT * FROM fcm_tokens LIMIT 1;`

