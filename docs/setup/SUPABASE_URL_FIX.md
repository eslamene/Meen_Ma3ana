# Supabase URL Configuration - Quick Fix

## ⚠️ CRITICAL: Fix These Issues Now

### Issue 1: Incomplete Site URL
Your Site URL shows: `https://meen.ma3ana.o` (missing "rg")

**Fix:**
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. In the **Site URL** field, change it to:
   ```
   https://meen.ma3ana.org
   ```
   (Make sure it's complete: `meen.ma3ana.org` not `meen.ma3ana.o`)
3. Click **"Save changes"** button

### Issue 2: Missing Redirect URLs
You have "No Redirect URLs" - this is required!

**Fix:**
1. In the same page (URL Configuration)
2. Click the **"Add URL"** button
3. Add these URLs one by one (click "Add URL" for each):
   ```
   https://meen.ma3ana.org/en/auth/callback
   https://meen.ma3ana.org/ar/auth/callback
   http://localhost:3000/en/auth/callback
   http://localhost:3000/ar/auth/callback
   ```
4. After adding all, click **"Save changes"**

### Issue 3: Environment Variable Trailing Slash
Your `NEXT_PUBLIC_APP_URL` has a trailing slash: `https://meen.ma3ana.org/`

**Fix:**
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_APP_URL`
3. Change it from: `https://meen.ma3ana.org/`
4. To: `https://meen.ma3ana.org` (remove the trailing slash)
5. **Redeploy** your application

## After Making Changes

1. **Wait 2-3 minutes** for Supabase changes to propagate
2. **Redeploy** your Vercel application (after changing env var)
3. **Test** by registering a new user
4. **Check** the email confirmation link - it should now work

## Verification

After fixing, the email confirmation link should look like:
```
https://[your-project].supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://meen.ma3ana.org/en/auth/callback
```

The `redirect_to` parameter should be your complete production domain.

## Why This Matters

- **Site URL**: Supabase uses this as the default redirect URL and it overrides `emailRedirectTo` if not set correctly
- **Redirect URLs**: These are the allowed URLs that Supabase will redirect to after authentication
- **Environment Variable**: This is what your code uses to generate the redirect URL

All three must match and be correct for email confirmation to work!

