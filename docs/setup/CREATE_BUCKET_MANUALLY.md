# Create Contributions Bucket Manually

## Quick Fix for Storage Error

The error you're seeing is because the `contributions` storage bucket doesn't exist in your Supabase project.

## Steps to Create the Bucket:

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw

2. **Navigate to Storage:**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket:**
   - Click "Create a new bucket"
   - **Name:** `contributions` (exactly this, case-sensitive)
   - **Public bucket:** ✅ Check this option
   - **File size limit:** `10 MB`
   - **Allowed MIME types:** Add these one by one:
     - `image/png`
     - `image/jpeg`
     - `image/jpg`
     - `application/pdf`

4. **Click "Create bucket"**

## That's it!

After creating the bucket, the file upload in the contribution form should work without errors.

## Alternative: Get Service Role Key

If you want to use the automated script approach:

1. In your Supabase dashboard, go to Settings → API
2. Copy the "service_role" key (not the anon key)
3. Add to your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Run: `node scripts/create-contributions-bucket.js` 