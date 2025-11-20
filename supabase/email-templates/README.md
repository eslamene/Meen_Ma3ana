# Supabase Email Templates

This directory contains custom HTML email templates for Supabase Auth that match the Meen Ma3ana landing page design.

## Brand Colors

- **Primary (Meen)**: `#6B8E7E` - Olive Green
- **Secondary (Ma3ana)**: `#E74C3C` - Vibrant Red
- **Header Gradient**: Light yellow-orange-red gradient (`#FEF3C7` → `#FED7AA` → `#FEE2E2`)
- **Footer Background**: `#6B8E7E`

## Available Templates

1. **password-reset.html** - Password reset email
2. **email-confirmation.html** - Email confirmation email
3. **magic-link.html** - Magic link sign-in email
4. **change-email.html** - Email change confirmation
5. **reauthentication.html** - Reauthentication confirmation email
6. **invite-user.html** - User invitation email

## How to Apply Templates in Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. For each template type:
   - Select the template type (e.g., "Reset Password", "Confirm Signup", etc.)
   - Click **Edit Template**
   - Copy the HTML content from the corresponding file in this directory
   - Paste it into the template editor
   - Click **Save**

### Option 2: Using Supabase CLI

If you have Supabase CLI configured, you can use the Management API to update templates programmatically.

### Option 3: Using Supabase Management API

You can use the Supabase Management API to update email templates. Here's an example using curl:

```bash
# Set your variables
SUPABASE_ACCESS_TOKEN="your-access-token"
PROJECT_REF="your-project-ref"

# Update password reset template
curl -X PUT \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/auth/templates/password-reset" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "subject": "Reset Your Password - Meen Ma3ana",
  "content": "$(cat supabase/email-templates/password-reset.html | jq -Rs .)"
}
EOF
```

## Template Variables

Supabase provides the following variables that are automatically replaced:

- `{{ .ConfirmationURL }}` - The confirmation/reset link URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Year }}` - Current year

## Design Features

All templates include:

- ✅ Brand colors matching the landing page (#6B8E7E and #E74C3C)
- ✅ Responsive design that works on mobile and desktop
- ✅ Gradient header matching the landing page style
- ✅ Branded footer with Meen Ma3ana branding
- ✅ Clear call-to-action buttons
- ✅ Security notices where appropriate
- ✅ Professional, clean design
- ✅ Email client compatibility (including Outlook)

## Testing

After applying templates:

1. Test password reset flow
2. Test email confirmation flow
3. Test magic link sign-in (if enabled)
4. Test reauthentication flow (if used)
5. Test user invitation flow (if used)
6. Verify emails render correctly in:
   - Gmail (web and mobile)
   - Outlook
   - Apple Mail
   - Other common email clients

## Customization

To customize the templates:

1. Edit the HTML files in this directory
2. Update colors, text, or layout as needed
3. Re-apply to Supabase using one of the methods above
4. Test thoroughly before deploying to production

## Notes

- Templates use inline styles for maximum email client compatibility
- The design is optimized for both light and dark email clients
- All links use the `{{ .ConfirmationURL }}` variable which Supabase automatically replaces
- The footer includes dynamic year using `{{ .Year }}` variable

