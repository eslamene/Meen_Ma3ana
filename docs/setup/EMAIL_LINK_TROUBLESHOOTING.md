# Email Link Troubleshooting Guide

## Quick Checklist

If Supabase is still sending incorrect links, check these in order:

### ✅ 1. Supabase Dashboard Configuration (MOST IMPORTANT)

**The Supabase Site URL setting OVERRIDES the `emailRedirectTo` parameter!**

1. Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL** must be set to: `https://meen.ma3ana.org` (NO trailing slash)
3. **Redirect URLs** must include:
   ```
   https://meen.ma3ana.org/en/auth/callback
   https://meen.ma3ana.org/ar/auth/callback
   http://localhost:3000/en/auth/callback
   http://localhost:3000/ar/auth/callback
   ```
4. Click **Save**
5. **Wait 2-3 minutes** for changes to propagate

### ✅ 2. Environment Variable in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Verify `NEXT_PUBLIC_APP_URL` is set to: `https://meen.ma3ana.org` (NO trailing slash)
3. Make sure it's set for **Production**, **Preview**, and **Development**
4. **Redeploy** after adding/changing environment variables

### ✅ 3. Check Browser Console

After registering a new user, check the browser console. You should see:
```
📧 Email redirect URL: https://meen.ma3ana.org/en/auth/callback
📧 App URL: https://meen.ma3ana.org
📧 Environment: production
📧 NEXT_PUBLIC_APP_URL: https://meen.ma3ana.org
```

If you see `localhost` in production, the environment variable is not set correctly.

### ✅ 4. Test the Actual Email

1. Register a new user
2. Check the email confirmation link
3. The link should look like:
   ```
   https://[your-supabase-project].supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://meen.ma3ana.org/en/auth/callback
   ```
4. The `redirect_to` parameter should be your production domain

## Common Issues

### Issue: Links still show localhost in production

**Cause:** Supabase Site URL is set to localhost or environment variable is missing

**Fix:**
1. Update Supabase Site URL (see Step 1 above)
2. Set `NEXT_PUBLIC_APP_URL` in Vercel
3. Redeploy
4. Wait a few minutes
5. Test with a new registration

### Issue: Links work in development but not production

**Cause:** Environment variable not set in production environment

**Fix:**
1. In Vercel, make sure `NEXT_PUBLIC_APP_URL` is set for **Production** environment
2. Redeploy production
3. Clear browser cache
4. Test again

### Issue: Resend email still uses wrong URL

**Fix:** This has been fixed in the code. The resend function now uses the same `emailRedirectTo` as registration.

## Verification Steps

1. **Check Supabase Dashboard:**
   - Authentication → URL Configuration
   - Site URL = `https://meen.ma3ana.org`
   - Redirect URLs include production URLs

2. **Check Vercel Environment Variables:**
   - `NEXT_PUBLIC_APP_URL` = `https://meen.ma3ana.org`

3. **Check Browser Console:**
   - Register a new user
   - Look for the debug logs showing the URL being used

4. **Check Actual Email:**
   - Open the confirmation email
   - Inspect the link
   - Verify `redirect_to` parameter uses production domain

## Still Not Working?

If after all these steps the links are still wrong:

1. **Clear Supabase cache:**
   - Wait 5-10 minutes after changing Site URL
   - Supabase caches these settings

2. **Check Supabase project settings:**
   - Make sure you're editing the correct project
   - Verify project URL matches your app

3. **Contact Supabase support:**
   - If Site URL is correct but links are still wrong
   - This might be a Supabase platform issue

## Debug Mode

The code now logs the URL being used. Check browser console during registration to see:
- What URL is being generated
- What environment variables are available
- What the final redirect URL is

This helps identify if the issue is:
- Code not using the right URL (check logs)
- Supabase ignoring the URL (check email link)
- Environment variable not set (check logs)

