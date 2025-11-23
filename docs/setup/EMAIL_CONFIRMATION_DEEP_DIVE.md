# Email Confirmation Deep Dive - Troubleshooting Guide

## Common Causes of "unexpected_failure" Errors

### 1. Email Provider Prefetching (Most Common)

**Problem:** Email providers (especially Microsoft Defender for Office 365, Gmail security scanners) automatically prefetch links in emails for security scanning. This consumes the confirmation code before the user clicks it.

**Symptoms:**
- User clicks verification link
- Gets "unexpected_failure" or "code already used" error
- Link appears to be valid but fails when clicked

**Solutions:**

**Option A: Use Email OTP Instead of Direct Links**
- Include a one-time password (OTP) in the email
- User enters OTP in your app to verify
- More secure and avoids prefetching issues

**Option B: Two-Step Confirmation**
- Email contains a link to your confirmation page
- User clicks link → lands on your page
- User clicks "Confirm" button → triggers actual confirmation
- Prevents prefetching from consuming the code

**Option C: Increase Code Expiry Time**
- In Supabase Dashboard → Authentication → Settings
- Increase the confirmation link expiry time
- Gives more time between prefetch and user click

### 2. Code Already Used

**Problem:** User clicks link multiple times, or link is shared/accessed from multiple devices.

**Solution:** 
- Our callback route already handles this
- Shows "code already used" message
- Provides resend option

### 3. Code Expired

**Problem:** User waits too long before clicking the link.

**Solution:**
- Our callback route detects expired codes
- Shows "code expired" message
- Provides resend option

### 4. Redirect URL Mismatch

**Problem:** The `redirect_to` parameter in the email doesn't match allowed redirect URLs.

**Check:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Verify Redirect URLs include:
   - `https://meen.ma3ana.org/en/auth/callback`
   - `https://meen.ma3ana.org/ar/auth/callback`
3. Verify Site URL is: `https://meen.ma3ana.org`

### 5. Database Trigger Issues

**Problem:** Database triggers might be failing during user creation/update.

**Check:**
- Review Supabase logs for trigger errors
- Check if `sync_email_verified` trigger is working
- Verify `assign_donor_role_to_new_user` trigger isn't blocking

### 6. RLS (Row Level Security) Policies

**Problem:** RLS policies might be blocking the upsert operation.

**Check:**
- Verify `users` table has proper RLS policies
- Ensure service role can upsert users
- Check if authenticated users can update their own records

## Debugging Steps

### Step 1: Check Server Logs

Look for these logs in your Vercel/Next.js logs:
```
Attempting to exchange code for session: {...}
Email confirmation error: {...}
Error syncing email_verified: {...}
```

### Step 2: Check Supabase Logs

1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Look for errors during email confirmation
3. Check for trigger failures

### Step 3: Test the Actual Email Link

1. Register a new user
2. Open the email immediately
3. Right-click the link → "Copy link address"
4. Check the `redirect_to` parameter:
   ```
   https://[project].supabase.co/auth/v1/verify?token=...&redirect_to=https://meen.ma3ana.org/en/auth/callback
   ```
5. Verify it matches your redirect URLs exactly

### Step 4: Test Code Exchange Directly

You can test if the code is valid by checking Supabase logs or using the Supabase client directly.

## Recommended Solutions

### Immediate Fix: Improve Error Handling

The callback route now:
- Catches all errors gracefully
- Logs detailed error information
- Provides user-friendly error messages
- Allows resending verification emails

### Long-term Fix: Consider Email OTP

For production, consider implementing email OTP instead of direct confirmation links to avoid prefetching issues entirely.

## Verification Checklist

- [ ] Site URL is correct: `https://meen.ma3ana.org`
- [ ] Redirect URLs are added and match exactly
- [ ] Environment variable `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] No trailing slashes in URLs
- [ ] Email templates use `{{ .ConfirmationURL }}` correctly
- [ ] Callback route handles all error cases
- [ ] Database triggers are working
- [ ] RLS policies allow necessary operations

