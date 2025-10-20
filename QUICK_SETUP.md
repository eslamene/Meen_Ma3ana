# 🚀 Quick Setup Guide - Meen Ma3ana Charity Platform

## ⚡ One-Command Setup

```bash
# 1. Install dependencies
npm install

# 2. Run the complete setup (environment + storage buckets + RLS fix)
npm run setup:all

# 3. Add your Supabase service role key to .env
# Edit .env and replace 'your_service_role_key_here' with your actual key

# 4. Test the upload functionality
npm run test:upload

# 5. Start the development server
npm run dev
```

## 🔧 Manual Setup (if needed)

### 1. Environment Variables
```bash
npm run setup:env
```

This will:
- ✅ Fix DATABASE_URL encoding issues
- ✅ Add all required environment variables
- ✅ Ensure proper URL encoding for special characters

### 2. Storage Buckets
```bash
npm run setup:storage
```

This will create all necessary Supabase storage buckets:
- ✅ `case-images` (public, 5MB, images)
- ✅ `contributions` (private, 5MB, payment proofs)
- ✅ `users` (private, 2MB, profile pictures)
- ✅ `sponsor_applications` (private, 10MB, documents)
- ✅ `recurring_contributions` (private, 5MB, documents)

### 3. RLS Policies & Upload API
```bash
npm run setup:rls
npm run disable:rls
```

This will:
- ✅ Disable RLS for testing
- ✅ Drop all storage policies
- ✅ Set up server-side upload API
- ✅ Bypass authentication issues

## 🔑 Required Environment Variables

Make sure your `.env` file contains:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pmqqjfwpwmdcasheygsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration (automatically fixed by setup script)
DATABASE_URL=postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y%21%26PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Next.js Configuration
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

## 🐛 Common Issues & Solutions

### 1. Database Connection Error
**Error**: `URIError: URI malformed`
**Solution**: Run `npm run setup:env` to fix URL encoding

### 2. Storage Upload Error
**Error**: `Invalid key` or `Bucket not found`
**Solution**: Run `npm run setup:storage` to create buckets

### 3. RLS Policy Error
**Error**: `new row violates row-level security policy`
**Solution**: Run `npm run setup:rls` to disable RLS for testing

### 4. Missing Service Role Key
**Error**: Storage operations fail
**Solution**: Add your Supabase service role key to `.env`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Internationalized routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── cases/            # Case-related components
│   ├── contributions/    # Contribution components
│   └── sponsorships/     # Sponsorship components
├── lib/                  # Utility libraries
│   ├── db.ts            # Database connection
│   ├── supabase/        # Supabase clients
│   └── auth/            # Authentication utilities
└── drizzle/             # Database schema
    └── schema.ts        # Drizzle ORM schema
```

## 🎯 Key Features

- ✅ **CRUD Operations**: Full CRUD for cases, contributions, sponsorships
- ✅ **File Upload**: Secure file uploads to Supabase storage
- ✅ **Authentication**: Supabase Auth integration
- ✅ **Internationalization**: Arabic/English support
- ✅ **Admin Dashboard**: Analytics and management
- ✅ **Responsive Design**: Mobile-first approach

## 🚀 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:studio    # Open Drizzle Studio
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
```

## 🔍 Testing the Setup

1. **Database**: Visit `/en/cases` - should show cases
2. **File Upload**: Try creating a case with images
3. **Contributions**: Try donating to a case
4. **Authentication**: Test login/logout functionality

## 📞 Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure storage buckets are created
4. Check database connection

---

**🎉 You're all set! The platform should now work correctly with proper database connections and file uploads.** 