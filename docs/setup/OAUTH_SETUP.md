                                                                                                                                                                                                                                                                                                                                                                                qqq# OAuth Social Sign-In Setup Guide

This guide covers how to set up Google, Apple, and Facebook OAuth providers for quick sign-up in Meen Ma3ana.

## Overview

The application supports social authentication through:
- **Google** - Sign in with Google account
- **Apple** - Sign in with Apple ID
- **Facebook** - Sign in with Facebook account

## Prerequisites

1. Supabase project with authentication enabled
2. Developer accounts for each OAuth provider you want to enable
3. Access to your Supabase project dashboard

## Setup Instructions

### 1. Google OAuth Setup

#### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - Choose **External** user type
   - Fill in app information (name, support email, etc.)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Meen Ma3ana"
   - Authorized JavaScript origins:
     - `https://your-project-ref.supabase.co`
     - `http://localhost:3000` (for local development)
   - Authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
7. Copy the **Client ID** and **Client Secret**

#### Step 2: Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to expand
4. Enable the provider
5. Enter your **Client ID** and **Client Secret**
6. Click **Save**

### 2. Apple OAuth Setup

#### Step 1: Create Apple App ID and Service ID

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create an **App ID**:
   - Description: "Meen Ma3ana"
   - Bundle ID: `com.meenma3ana.app` (or your domain)
   - Enable **Sign in with Apple**
4. Create a **Service ID**:
   - Description: "Meen Ma3ana Web"
   - Identifier: `com.meenma3ana.web` (or your domain)
   - Enable **Sign in with Apple**
   - Configure domains and redirect URLs:
     - Domains: `your-project-ref.supabase.co`
     - Return URLs: `https://your-project-ref.supabase.co/auth/v1/callback`
5. Create a **Key** for Sign in with Apple:
   - Key Name: "Meen Ma3ana Sign In Key"
   - Enable **Sign in with Apple**
   - Download the key file (`.p8` file)
   - Note the **Key ID**
6. Get your **Team ID** from the top right of the Apple Developer portal

#### Step 2: Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Apple** and click to expand
4. Enable the provider
5. Enter the following:
   - **Services ID**: The Service ID you created (e.g., `com.meenma3ana.web`)
   - **Secret Key**: The contents of your `.p8` key file
   - **Apple Team ID**: Your Apple Team ID
   - **Key ID**: The Key ID from the key you created
6. Click **Save**

### 3. Facebook OAuth Setup

#### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** app type
4. Fill in app details:
   - App Name: "Meen Ma3ana"
   - Contact Email: Your email
5. Add **Facebook Login** product:
   - Go to **Products** → **Facebook Login** → **Set Up**
   - Choose **Web** platform
6. Configure Facebook Login:
   - Valid OAuth Redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
7. Get your **App ID** and **App Secret**:
   - Go to **Settings** → **Basic**
   - Copy **App ID** and **App Secret**

#### Step 2: Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Facebook** and click to expand
4. Enable the provider
5. Enter your **App ID** and **App Secret**
6. Click **Save**

## Environment Variables

No additional environment variables are needed in your Next.js app. Supabase handles OAuth configuration server-side.

## Testing

### Test Each Provider

1. **Google**:
   - Go to login/register page
   - Click "Continue with Google"
   - Should redirect to Google sign-in
   - After authentication, should redirect back to your app

2. **Apple**:
   - Go to login/register page
   - Click "Continue with Apple"
   - Should redirect to Apple sign-in
   - After authentication, should redirect back to your app

3. **Facebook**:
   - Go to login/register page
   - Click "Continue with Facebook"
   - Should redirect to Facebook sign-in
   - After authentication, should redirect back to your app

### Common Issues

#### Redirect URI Mismatch
- **Error**: "redirect_uri_mismatch"
- **Solution**: Ensure the redirect URI in your OAuth provider matches exactly: `https://your-project-ref.supabase.co/auth/v1/callback`

#### Invalid Client
- **Error**: "invalid_client"
- **Solution**: Verify your Client ID and Client Secret are correct in Supabase dashboard

#### Apple Sign-In Not Working
- **Error**: "invalid_client" or "unauthorized_client"
- **Solution**: 
  - Verify Service ID is correctly configured
  - Ensure the key file content is pasted correctly (including headers)
  - Check that Team ID and Key ID are correct

## User Data Mapping

When users sign in with OAuth, Supabase automatically maps:
- **Email**: From provider profile
- **Name**: From provider profile (split into first_name/last_name if available)
- **Avatar**: From provider profile picture (if available)

The user record is automatically created in the `users` table via database triggers.

## Security Considerations

1. **HTTPS Required**: OAuth providers require HTTPS in production
2. **Redirect URIs**: Only add trusted redirect URIs to prevent phishing
3. **Client Secrets**: Never expose client secrets in client-side code
4. **Token Storage**: Supabase handles token storage securely

## Production Checklist

- [ ] All OAuth providers configured in Supabase
- [ ] Redirect URIs updated for production domain
- [ ] OAuth consent screens published (Google/Apple)
- [ ] Facebook app in Live mode
- [ ] Tested all three providers
- [ ] Error handling verified
- [ ] User data mapping verified

## Troubleshooting

### OAuth Button Not Appearing
- Check that the provider is enabled in Supabase dashboard
- Verify the `SocialSignIn` component is imported correctly

### OAuth Flow Completes But User Not Created
- Check database triggers for user creation
- Verify RLS policies allow user creation
- Check Supabase logs for errors

### Redirect Loop
- Verify callback route is correctly configured
- Check that redirect URL matches exactly in provider settings

## Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Setup](https://developer.apple.com/sign-in-with-apple/)
- [Facebook Login Setup](https://developers.facebook.com/docs/facebook-login/web)


