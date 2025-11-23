# Email Confirmation Setup Guide

This guide explains how to configure email confirmation links to use the correct production URL instead of localhost.

## Problem

Email confirmation links are being sent with `localhost:3000` redirect URLs instead of the production domain. This happens when:

1. The `NEXT_PUBLIC_APP_URL` environment variable is not set in production
2. The Supabase Site URL is set to localhost in the Supabase dashboard

## Solution

### Step 1: Set Environment Variable in Production

In your Vercel (or other hosting) dashboard, set the following environment variable:

```
NEXT_PUBLIC_APP_URL=https://meen.ma3ana.org
```

**Important:** 
- Use your actual production domain (currently `https://meen.ma3ana.org`)
- Set this for **Production**, **Preview**, and **Development** environments
- **DO NOT include a trailing slash** - The code automatically handles this, but it's best practice to omit it
- If you accidentally added a trailing slash, the code will automatically remove it, but it's cleaner without it

### Step 2: Update Supabase Site URL

The Supabase Site URL setting takes precedence over the `emailRedirectTo` parameter in some cases. You must update it in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the **Site URL** to your production domain:
   ```
   https://meen.ma3ana.org
   ```
4. Add **Redirect URLs** (one per line):
   ```
   https://meen.ma3ana.org/en/auth/callback
   https://meen.ma3ana.org/ar/auth/callback
   http://localhost:3000/en/auth/callback
   http://localhost:3000/ar/auth/callback
   ```
5. Click **Save**

### Step 3: Verify Configuration

After updating both settings:

1. **Test in Development:**
   - Sign up a new user
   - Check the email confirmation link
   - It should use `http://localhost:3000` (correct for development)

2. **Test in Production:**
   - Sign up a new user in production
   - Check the email confirmation link
   - It should use your production domain (e.g., `https://meen.ma3ana.org`)

## How It Works

The application uses the `getAppUrl()` function from `src/lib/utils/app-url.ts` to determine the correct URL:

1. **First Priority:** `NEXT_PUBLIC_APP_URL` environment variable (trailing slashes are automatically removed)
2. **Second Priority:** `NEXT_PUBLIC_SITE_URL` environment variable (trailing slashes are automatically removed)
3. **Development Fallback:** `window.location.origin` (localhost)
4. **Production Fallback:** `https://meen.ma3ana.org`

The function is called in:
- `src/components/auth/AuthForm.tsx` - During user signup
- `src/components/auth/PasswordResetForm.tsx` - During password reset
- `src/components/auth/SocialSignIn.tsx` - During OAuth sign-in

## Troubleshooting

### Most Common Issue: Supabase Site URL Not Updated

**If emails still show localhost even after setting `NEXT_PUBLIC_APP_URL`:**

The Supabase Site URL setting in the dashboard **overrides** the `emailRedirectTo` parameter in many cases. This is the #1 cause of localhost URLs in production emails.

**Fix:**
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://meen.ma3ana.org` (no trailing slash)
3. Add all redirect URLs as shown in Step 2 above
4. Click **Save**
5. **Important:** Wait a few minutes for the change to propagate, then test again

### Emails Still Show Localhost

1. **Check Environment Variables:**
   ```bash
   # In Vercel dashboard, verify NEXT_PUBLIC_APP_URL is set
   # The value should be: https://meen.ma3ana.org (no trailing slash)
   # Note: Trailing slashes are automatically handled, but best practice is to omit them
   ```

2. **Check for Trailing Slash:**
   - If your `NEXT_PUBLIC_APP_URL` has a trailing slash (e.g., `https://meen.ma3ana.org/`), the code will automatically remove it
   - However, for consistency, remove the trailing slash in Vercel: `https://meen.ma3ana.org`

2. **Check Supabase Site URL:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Verify Site URL is set to production domain
   - Verify Redirect URLs include your production callback URLs

3. **Rebuild Application:**
   - After setting environment variables, trigger a new deployment
   - Environment variables are baked into the build at build time

4. **Clear Browser Cache:**
   - Old client-side code might be cached
   - Hard refresh or clear cache

### Development vs Production

- **Development:** Uses `http://localhost:3000` (correct behavior)
- **Production:** Should use your production domain (e.g., `https://meen.ma3ana.org`)

If production is using localhost, the environment variable is not set correctly.

## Related Files

- `src/lib/utils/app-url.ts` - URL resolution logic
- `src/components/auth/AuthForm.tsx` - Signup with email redirect
- `src/components/auth/PasswordResetForm.tsx` - Password reset redirect
- `src/components/auth/SocialSignIn.tsx` - OAuth redirect

## Additional Notes

- The `emailRedirectTo` parameter in `signUp()` is used, but Supabase also checks the Site URL setting
- Both must be configured correctly for reliable email confirmation links
- The Site URL is also used for other Supabase auth features (OAuth, magic links, etc.)

