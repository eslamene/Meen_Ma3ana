# Create Beneficiaries Storage Bucket

The `beneficiaries` storage bucket is required for uploading beneficiary documents (identity copies, photos, etc.).

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
   node scripts/61-create-beneficiaries-bucket.js
   ```

3. **Verify the bucket was created:**
   - Go to your Supabase dashboard
   - Navigate to Storage → Buckets
   - You should see the `beneficiaries` bucket listed

## Method 2: Manual Creation via Dashboard

### Steps:

1. **Go to your Supabase Dashboard:**
   - Visit your Supabase project dashboard
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket:**
   - Click **"+ New bucket"** button
   - Configure the bucket as follows:
     - **Name:** `beneficiaries` (exactly this, case-sensitive)
     - **Public bucket:** ❌ **Unchecked** (Private bucket)
     - **File size limit:** `5 MB`
     - **Allowed MIME types:** Add these one by one:
       - `image/jpeg`
       - `image/jpg`
       - `image/png`
       - `image/gif`
       - `image/webp`
       - `application/pdf`

3. **Click "Create bucket"**

## Method 3: Using the Main Setup Script

If you want to create all buckets at once (including beneficiaries):

```bash
node scripts/60-setup-storage-buckets.js
```

This will create all required buckets including the `beneficiaries` bucket.

## Bucket Configuration Details

- **Name:** `beneficiaries`
- **Public:** No (Private bucket - requires authentication)
- **File Size Limit:** 5 MB
- **Allowed MIME Types:**
  - Images: JPEG, JPG, PNG, GIF, WebP
  - Documents: PDF

## Step 2: Create Storage Policies (REQUIRED)

After creating the bucket, you **MUST** create storage policies to allow uploads and access. Without policies, uploads will fail with permission errors.

### Option A: Run the Migration (Recommended)

If you're using migrations, the policies are already included in:
- `supabase/migrations/056_create_beneficiaries_storage_policies.sql`

### Option B: Run SQL Manually

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy and paste the SQL from `supabase/migrations/056_create_beneficiaries_storage_policies.sql`
3. Click **Run**

### Option C: Use the Complete Setup Script

Run the complete storage policies setup (includes all buckets):
```sql
-- Copy contents from supabase/setup-all-storage-policies.sql
-- Run in Supabase SQL Editor
```

### What the Policies Do:

1. **beneficiaries_authenticated_read**: Authenticated users can view beneficiary documents
2. **beneficiaries_authenticated_upload**: Authenticated users can upload documents
3. **beneficiaries_owner_manage**: File owners can update/delete their files
4. **beneficiaries_admin_access**: Admins can access all beneficiary documents

## Verification

After creating the bucket AND policies, you can verify it works by:

1. Going to the beneficiary edit page
2. Uploading a test document
3. Checking that the file appears in the documents list
4. Verifying policies in Supabase Dashboard → Storage → Policies tab

## Troubleshooting

### "Bucket not found" error:
- Make sure the bucket name is exactly `beneficiaries` (lowercase, no spaces)
- Verify the bucket exists in Supabase dashboard

### "Permission denied" error:
- Check that RLS policies are set up correctly
- Verify your service role key is correct

### Upload fails:
- Check file size (must be under 5MB)
- Verify file type is in the allowed MIME types list
- Check browser console for detailed error messages

