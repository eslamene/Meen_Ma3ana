# Setting Up Beneficiaries Storage Policies

If you're getting a "must be owner of table objects" error when trying to create storage policies, follow these steps:

## Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Go to **SQL Editor** in the left sidebar

2. **Make sure you're logged in as project owner:**
   - The SQL Editor should have full permissions
   - If you're a collaborator, you may need to ask the project owner to run it

3. **Run the SQL:**
   - Copy the contents of `supabase/migrations/056_create_beneficiaries_storage_policies.sql`
   - Paste into the SQL Editor
   - Click **Run**

## Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

Or run the SQL file directly:

```bash
supabase db execute -f supabase/migrations/056_create_beneficiaries_storage_policies.sql
```

## Method 3: Using Service Role Key (Programmatic)

If you need to run this programmatically, use the service role key:

```javascript
// Example using Node.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role, not anon key
)

const sql = fs.readFileSync('supabase/migrations/056_create_beneficiaries_storage_policies.sql', 'utf8')

// Execute the SQL
const { data, error } = await supabase.rpc('exec_sql', { sql })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Policies created successfully')
}
```

## Method 4: Manual Policy Creation via Dashboard

If SQL execution fails, you can create policies manually:

1. Go to **Storage** → **Policies** in Supabase Dashboard
2. Select the `beneficiaries` bucket
3. Click **New Policy** for each policy:

### Policy 1: Authenticated Read
- **Policy name:** `beneficiaries_authenticated_read`
- **Allowed operation:** SELECT
- **Policy definition:**
  ```sql
  bucket_id = 'beneficiaries' AND auth.role() = 'authenticated'
  ```

### Policy 2: Authenticated Upload
- **Policy name:** `beneficiaries_authenticated_upload`
- **Allowed operation:** INSERT
- **Policy definition:**
  ```sql
  bucket_id = 'beneficiaries' AND auth.role() = 'authenticated'
  ```

### Policy 3: Owner Update
- **Policy name:** `beneficiaries_owner_update`
- **Allowed operation:** UPDATE
- **Policy definition:**
  ```sql
  bucket_id = 'beneficiaries' AND auth.uid() = owner
  ```

### Policy 4: Owner Delete
- **Policy name:** `beneficiaries_owner_delete`
- **Allowed operation:** DELETE
- **Policy definition:**
  ```sql
  bucket_id = 'beneficiaries' AND auth.uid() = owner
  ```

### Policy 5: Admin Access
- **Policy name:** `beneficiaries_admin_access`
- **Allowed operation:** ALL
- **Policy definition:**
  ```sql
  bucket_id = 'beneficiaries' AND EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
  ```

## Verification

After creating the policies, verify they exist:

```sql
SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'beneficiaries%'
ORDER BY policyname;
```

You should see 5 policies:
1. `beneficiaries_authenticated_read` (SELECT)
2. `beneficiaries_authenticated_upload` (INSERT)
3. `beneficiaries_owner_update` (UPDATE)
4. `beneficiaries_owner_delete` (DELETE)
5. `beneficiaries_admin_access` (ALL)

## Troubleshooting

### "must be owner of table objects"
- Make sure you're logged in as project owner in Supabase Dashboard
- Try using Supabase CLI instead
- Contact your project owner to run the SQL

### "relation admin_user_roles does not exist"
- Make sure you've run the admin system migrations first
- Check that `admin_user_roles` and `admin_roles` tables exist

### Policies created but uploads still fail
- Check that the bucket exists: `beneficiaries`
- Verify bucket is not public (should be private)
- Check file size limits (5MB max)
- Verify MIME types are allowed

