# Landing Page Setup Guide

This guide covers the marketing landing page setup and configuration.

## Features

The marketing landing page includes:
- **Hero Section**: Main call-to-action with branding
- **Features Section**: Platform benefits and capabilities
- **Stats Section**: Impact metrics and statistics
- **Stories Section**: Success stories and testimonials
- **Values Section**: Core values and principles
- **CTA Section**: Final call-to-action
- **Contact Form**: Visitor inquiry submission

## Routes

- **Landing Page**: `/[locale]/landing` (e.g., `/en/landing`, `/ar/landing`)
- **Root Redirect**: `/` redirects to `/en/landing`
- **404 Redirect**: Unknown routes redirect to landing page

## Database Setup

### Landing Contacts Table

The contact form requires the `landing_contacts` table in Supabase. Apply the migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the migration file:
# supabase/migrations/create_landing_contacts_table.sql
```

The migration creates:
- `landing_contacts` table with columns: `id`, `name`, `email`, `message`, `created_at`
- RLS policies allowing anonymous inserts and admin-only reads
- Indexes for performance
- Email validation constraints

### Table Schema

```sql
CREATE TABLE landing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000)
);
```

## Environment Variables

### PRELAUNCH Mode

To block access to app routes during pre-launch:

```bash
# In your .env or .env.local file
PRELAUNCH=true
```

**What it does:**
- Blocks all app routes (`/cases`, `/projects`, `/auth`, `/dashboard`, `/admin`)
- Allows only:
  - Landing pages (`/[locale]/landing`)
  - Static assets (`/_next/`, images, CSS, JS)
  - Contact API (`/api/contact`)
- Redirects blocked routes to the appropriate landing page

**When to use:**
- During pre-launch phase
- When you want to hide the app from public access
- For soft launches or beta testing periods

**To disable:**
```bash
# Remove the variable or set to false
PRELAUNCH=false
# or simply remove the line
```

## SEO Configuration

The landing page includes:
- **Metadata**: Title, description, keywords
- **OpenGraph Tags**: Social media preview cards
- **Twitter Cards**: Twitter-specific preview cards
- **Robots.txt**: Generated via `src/app/robots.ts`
  - Allows indexing of `/[locale]/landing` routes
  - Blocks indexing of app routes

## Internationalization

The landing page supports:
- **English (en)**: Default locale
- **Arabic (ar)**: RTL layout with Cairo font

All content is translatable via:
- `messages/en.json` - `landing.*` namespace
- `messages/ar.json` - `landing.*` namespace

## Contact Form

The contact form (`/api/contact`) includes:
- Input validation (email format, message length)
- Rate limiting (5 requests per 15 minutes per IP)
- Supabase storage (gracefully handles missing table)
- Email validation regex
- Message length constraints (10-5000 characters)

## Component Structure

Marketing components are located in `src/components/marketing/`:
- `Header.tsx` - Minimal header with logo and language switcher
- `Hero.tsx` - Hero section with CTAs
- `Stats.tsx` - Impact statistics
- `Features.tsx` - Platform features
- `Stories.tsx` - Success stories
- `Values.tsx` - Core values
- `CTA.tsx` - Final call-to-action
- `ContactForm.tsx` - Contact form component
- `Modal.tsx` - Accessible modal component

## Layout Isolation

The marketing layout (`src/app/(marketing)/layout.tsx`) is isolated from the app:
- **No AuthProvider**: No authentication checks
- **No ToastProvider**: No app notifications
- **No PageLayout**: No app navigation
- **No RBAC**: No permission checks
- **Minimal Dependencies**: Only i18n and styling

This ensures:
- Faster page loads
- Lower bundle size
- No data leakage
- Better privacy

## Styling

- **English**: Inter font (Google Fonts)
- **Arabic**: Cairo font (Google Fonts) with RTL support
- **Tailwind CSS**: Utility-first styling
- **Warm Palette**: Blue and indigo gradients
- **Responsive**: Mobile-first design

## Testing

To test the landing page:

```bash
# Start development server
npm run dev

# Visit landing pages
http://localhost:3000/en/landing
http://localhost:3000/ar/landing

# Test contact form
# Submit a form at /[locale]/landing#contact
# Check Supabase landing_contacts table
```

## Production Checklist

- [ ] Apply `create_landing_contacts_table.sql` migration
- [ ] Verify RLS policies are active
- [ ] Test contact form submission
- [ ] Verify email validation
- [ ] Check rate limiting
- [ ] Test SEO metadata (OpenGraph, Twitter)
- [ ] Verify robots.txt generation
- [ ] Test RTL layout for Arabic
- [ ] Verify font loading (Inter/Cairo)
- [ ] Set `PRELAUNCH=true` if needed for pre-launch phase

## Troubleshooting

### Contact Form Not Saving
- Ensure `landing_contacts` table exists
- Check Supabase RLS policies
- Verify API route is accessible
- Check rate limiting (5 requests per 15 minutes)

### Landing Page Not Loading
- Verify route structure: `/[locale]/landing`
- Check marketing layout exists
- Verify i18n messages are loaded
- Check for console errors

### RTL Not Working
- Verify locale is 'ar'
- Check font loading (Cairo)
- Verify `dir="rtl"` on html element
- Check Tailwind RTL classes

### PRELAUNCH Not Blocking Routes
- Verify `PRELAUNCH=true` in environment
- Restart development server
- Check proxy.ts logic
- Verify route matching logic

