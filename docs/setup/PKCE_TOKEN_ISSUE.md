# PKCE Token Verification Issue

## What We Know

From the Supabase API log:
- **Status:** 303 (redirect - normal)
- **Token Type:** PKCE token (`pkce_b168527afb14f97f8dc63238aa741bacebdadbe572e843d58da92760`)
- **Referer:** `https://temp-mail.org/` (temporary email service)
- **Redirect URL:** Correct (`https://meen.ma3ana.org/en/auth/callback`)
- **Result:** Supabase redirects with error parameters

## The Problem

Supabase is processing the verification request (303 redirect), but the verification is failing. The error parameters (`error=server_error&error_code=unexpected_failure`) are being added to the redirect URL.

## Most Likely Causes

### 1. Token Already Used (90% probability)

**Why:** The PKCE token was already consumed, likely by:
- Email prefetching (temp-mail.org or email provider)
- Multiple clicks on the same link
- Link shared/accessed from multiple devices

**Evidence:**
- Referer is `temp-mail.org` - temporary email services often prefetch links
- Supabase returns 303 (processed) but with error parameters
- No code parameter in callback URL

### 2. Token Expired

**Why:** PKCE tokens expire after a set time (default: 1 hour)

**Check:** How long between email sent and link clicked?

### 3. PKCE Flow Issue

**Why:** PKCE tokens require a code verifier that's generated during signup. If the flow is interrupted, the token might be invalid.

**Check:** Is the signup flow completing correctly?

## Solutions

### Immediate: Check for Multiple Token Uses

1. Check Supabase logs for multiple requests to `/auth/v1/verify` with the same token
2. Look for the token `pkce_b168527afb14f97f8dc63238aa741bacebdadbe572e843d58da92760` in logs
3. See if it was accessed multiple times

### Solution 1: Handle Token Reuse Gracefully

If the token was already used, we should:
1. Detect this specific error
2. Show a clear message: "This verification link has already been used"
3. Provide a "Resend Verification Email" button

### Solution 2: Implement Two-Step Verification

Instead of direct verification:
1. Email link goes to confirmation page
2. User clicks "Confirm" button
3. Button triggers verification
4. Prevents prefetching from consuming token

### Solution 3: Use Email OTP

Replace PKCE tokens with OTP:
1. Email contains 6-digit code
2. User enters code in app
3. App verifies code
4. No prefetching possible

## Testing

### Test 1: Fresh Token
1. Register new user
2. Click link **immediately** (within 10 seconds)
3. If it works → Token reuse is the issue

### Test 2: Check Token in Supabase
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user
3. Check if email is confirmed
4. Check user creation timestamp vs verification attempt timestamp

### Test 3: Check Logs for Token Reuse
1. Search Supabase logs for the token
2. See how many times it was accessed
3. Check timestamps

## Next Steps

1. **Check Supabase logs** for multiple uses of the same token
2. **Test with a real email** (not temp-mail.org) to rule out prefetching
3. **Implement better error handling** for "token already used" case
4. **Consider two-step verification** to prevent prefetching








