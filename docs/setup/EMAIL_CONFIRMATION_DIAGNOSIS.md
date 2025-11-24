# Email Confirmation Error Diagnosis Guide

## Understanding the "unexpected_failure" Error

When you see `error=server_error&error_code=unexpected_failure` in the callback URL, it means **Supabase failed during the verification process BEFORE our callback code runs**.

## What's Happening

1. User clicks email confirmation link
2. Browser goes to: `https://[project].supabase.co/auth/v1/verify?token=...&redirect_to=...`
3. Supabase tries to verify the token
4. **Supabase fails** (this is where the error occurs)
5. Supabase redirects to: `https://meen.ma3ana.org/en/auth/callback?error=server_error&error_code=unexpected_failure`
6. Our callback route detects the error and redirects to login page

## Where to Check Logs

### 1. Vercel Logs (Your App)
- Go to: **Vercel Dashboard** → **Logs**
- Look for: `🚀 Callback route hit:` - Shows all incoming parameters
- Look for: `❌ Supabase auth error from query params:` - Shows the error details
- **Important:** Click on a specific `/en/auth/callback` entry to see detailed logs

### 2. Supabase Logs (Supabase Service)
- Go to: **Supabase Dashboard** → **Logs** → **Postgres Logs** or **API Logs**
- Look for errors during the verification process
- Check for database trigger failures
- Check for RLS policy violations

### 3. Browser Console
- Open browser DevTools → Console
- Look for any JavaScript errors
- Check Network tab for failed requests

## Most Common Causes

### 1. Email Prefetching (80% of cases)
**Symptom:** Link works immediately after email arrives, but fails if clicked later

**Why:** Email providers (Gmail, Outlook, Microsoft Defender) prefetch links for security scanning, consuming the code before you click.

**Solution:** 
- Click the link **immediately** after receiving the email (within 30 seconds)
- Or implement Email OTP instead of direct links

### 2. Code Already Used
**Symptom:** Error happens every time, even with fresh emails

**Why:** Code was already consumed (prefetching, multiple clicks, shared link)

**Check:** Look in Vercel logs for `🔐 Attempting to exchange code for session:` - if you see this, the code reached our code. If you only see error params, Supabase failed before our code ran.

### 3. Code Expired
**Symptom:** Works for new emails, fails for old ones

**Why:** Supabase codes expire after a set time (default: 1 hour)

**Solution:** Resend verification email

### 4. Invalid Token Format
**Symptom:** Error happens consistently

**Why:** Token in email is malformed or corrupted

**Check:** Copy the full email link and verify the token parameter looks correct

### 5. Supabase Configuration Issue
**Symptom:** Error happens for all users

**Why:** Site URL or Redirect URLs misconfigured

**Check:**
- Supabase Dashboard → Authentication → URL Configuration
- Site URL: `https://meen.ma3ana.org` (no trailing slash)
- Redirect URLs must include:
  - `https://meen.ma3ana.org/en/auth/callback`
  - `https://meen.ma3ana.org/ar/auth/callback`

## Diagnostic Steps

### Step 1: Check Vercel Logs
1. Go to Vercel Dashboard → Logs
2. Filter for `/en/auth/callback` requests
3. Click on an entry that shows the error
4. Look for these log messages:
   - `🚀 Callback route hit:` - Shows what Supabase sent
   - `❌ Supabase auth error from query params:` - Shows the error details

### Step 2: Check if Code Exists
In the Vercel log details, check the `allSearchParams` field:
- **If `code` exists:** Supabase sent both error and code (rare, but might be recoverable)
- **If `code` is missing:** Supabase failed before generating a code (most common)

### Step 3: Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Check **Postgres Logs** for database errors
3. Check **API Logs** for auth service errors
4. Look for errors around the time of the failed verification

### Step 4: Test with Fresh Registration
1. Register a new test user
2. **Immediately** open the email (within 30 seconds)
3. **Immediately** click the verification link
4. Check if it works

**If it works immediately but fails later:** Email prefetching is the issue

**If it fails even immediately:** Configuration or code issue

## What the Logs Tell Us

### Scenario 1: Error Params, No Code
```
🚀 Callback route hit: { allSearchParams: { error: 'server_error', error_code: 'unexpected_failure' } }
❌ Supabase auth error from query params: { hasCode: false }
```
**Meaning:** Supabase failed during verification, never generated a code

### Scenario 2: Error Params + Code
```
🚀 Callback route hit: { allSearchParams: { error: 'server_error', code: 'abc123...' } }
❌ Supabase auth error from query params: { hasCode: true }
```
**Meaning:** Supabase sent both error and code (unusual, but we'll try to exchange it)

### Scenario 3: Code, No Error
```
🚀 Callback route hit: { allSearchParams: { code: 'abc123...' } }
🔐 Attempting to exchange code for session: { ... }
```
**Meaning:** Normal flow, code exchange will be attempted

## Next Steps Based on Findings

### If Email Prefetching:
- Implement Email OTP flow
- Or add a confirmation page (user clicks link → lands on page → clicks button to confirm)

### If Configuration Issue:
- Verify Supabase Site URL and Redirect URLs
- Check environment variables in Vercel

### If Database Issue:
- Check Supabase logs for trigger failures
- Verify RLS policies allow necessary operations

### If Code Issue:
- Check token format in email
- Verify email template is correct
- Check if token is being corrupted during email delivery

