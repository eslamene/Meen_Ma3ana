# Supabase Storage Setup Guide

This guide will help you set up all the required storage buckets for the Meen Ma3ana donation platform.

## Required Storage Buckets

The application requires the following storage buckets:

1. **`case-images`** - For case and case update images
2. **`contributions`** - For payment proof files
3. **`users`** - For user profile images
4. **`sponsor_applications`** - For sponsor application documents
5. **`recurring_contributions`** - For recurring contribution documents

## Method 1: Automated Script (Recommended)

### Prerequisites
- Node.js installed
- Your Supabase project URL and Service Role Key

### Setup Steps

1. **Get your Supabase Service Role Key:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the "service_role" key (not the anon key)
   - Add it to your `.env.local` file:
     ```
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```

2. **Run the automated script:**
   ```bash
   node scripts/create-all-storage-buckets.js
   ```

3. **Verify the buckets were created:**
   - Go to your Supabase dashboard
   - Navigate to Storage
   - You should see all 5 buckets listed

## Method 2: Manual Creation via Dashboard

### For each bucket, follow these steps:

1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Click "Create a new bucket"
4. Configure each bucket as follows:

#### case-images
- **Name:** `case-images`
- **Public bucket:** ✅ Yes
- **File size limit:** 5MB
- **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/gif, image/webp`

#### contributions
- **Name:** `contributions`
- **Public bucket:** ✅ Yes
- **File size limit:** 10MB
- **Allowed MIME types:** `image/png, image/jpeg, image/jpg, application/pdf`

#### users
- **Name:** `users`
- **Public bucket:** ✅ Yes
- **File size limit:** 5MB
- **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/gif, image/webp`

#### sponsor_applications
- **Name:** `sponsor_applications`
- **Public bucket:** ❌ No
- **File size limit:** 10MB
- **Allowed MIME types:** `image/png, image/jpeg, image/jpg, application/pdf`

#### recurring_contributions
- **Name:** `recurring_contributions`
- **Public bucket:** ❌ No
- **File size limit:** 10MB
- **Allowed MIME types:** `image/png, image/jpeg, image/jpg, application/pdf`

## Method 3: Supabase CLI

If you have the Supabase CLI installed:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Create buckets using the CLI:**
   ```bash
   # Create case-images bucket
   supabase storage create-bucket case-images --public --file-size-limit 5242880
   
   # Create contributions bucket
   supabase storage create-bucket contributions --public --file-size-limit 10485760
   
   # Create users bucket
   supabase storage create-bucket users --public --file-size-limit 5242880
   
   # Create sponsor_applications bucket (private)
   supabase storage create-bucket sponsor_applications --file-size-limit 10485760
   
   # Create recurring_contributions bucket (private)
   supabase storage create-bucket recurring_contributions --file-size-limit 10485760
   ```

## Bucket Configuration Details

### Public vs Private Buckets

- **Public buckets** (`case-images`, `contributions`, `users`): Files can be accessed directly via URL without authentication
- **Private buckets** (`sponsor_applications`, `recurring_contributions`): Files require authentication to access

### File Size Limits

- **5MB limit:** For images (case-images, users)
- **10MB limit:** For documents and payment proofs (contributions, sponsor_applications, recurring_contributions)

### Allowed File Types

- **Images:** PNG, JPEG, JPG, GIF, WebP
- **Documents:** PDF (for payment proofs and applications)

## Troubleshooting

### Common Issues

1. **"Bucket not found" error:**
   - Ensure the bucket name matches exactly (case-sensitive)
   - Verify the bucket was created successfully in the dashboard

2. **"Permission denied" error:**
   - Check that your Supabase client is properly configured
   - Verify RLS policies if using private buckets

3. **"File size too large" error:**
   - Check the file size limit configuration
   - Ensure the uploaded file is within the allowed size

4. **"Invalid file type" error:**
   - Verify the file extension matches the allowed MIME types
   - Check that the file is actually the type it claims to be

### Verification Steps

1. **Test file upload:**
   - Try uploading a small image to the `case-images` bucket
   - Verify the file appears in the Supabase dashboard

2. **Check public URLs:**
   - For public buckets, verify you can access files via their public URL
   - For private buckets, ensure authentication is required

3. **Test application functionality:**
   - Try creating a case with images
   - Test contribution submission with payment proof
   - Verify user profile image uploads

## Security Considerations

1. **RLS Policies:** Consider implementing Row Level Security policies for private buckets
2. **File Validation:** The application validates file types and sizes on the frontend
3. **Access Control:** Private buckets require proper authentication and authorization

## Support

If you encounter issues:

1. Check the Supabase documentation: https://supabase.com/docs/guides/storage
2. Verify your environment variables are correctly set
3. Check the browser console for detailed error messages
4. Ensure your Supabase project is active and not paused

---

**Note:** The automated script (`scripts/create-all-storage-buckets.js`) is the recommended approach as it creates all buckets with the correct configuration in one step. 