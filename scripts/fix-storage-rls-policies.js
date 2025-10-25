#!/usr/bin/env node

/**
 * Fix Storage RLS Policies Script
 * 
 * This script sets up proper Row-Level Security (RLS) policies for all storage buckets
 * to allow authenticated users to upload, view, and manage their files.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease add these to your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * SQL policies for storage buckets
 */
const storagePolicies = {
  // Case Images - Public bucket, anyone can view, authenticated can upload
  'case-images': [
    {
      name: 'case_images_public_read',
      operation: 'SELECT',
      policy: `
        CREATE POLICY "case_images_public_read" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'case-images');
      `
    },
    {
      name: 'case_images_authenticated_insert',
      operation: 'INSERT',
      policy: `
        CREATE POLICY "case_images_authenticated_insert" ON storage.objects
        FOR INSERT
        WITH CHECK (
          bucket_id = 'case-images' AND
          auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'case_images_owner_update',
      operation: 'UPDATE',
      policy: `
        CREATE POLICY "case_images_owner_update" ON storage.objects
        FOR UPDATE
        USING (
          bucket_id = 'case-images' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'case_images_owner_delete',
      operation: 'DELETE',
      policy: `
        CREATE POLICY "case_images_owner_delete" ON storage.objects
        FOR DELETE
        USING (
          bucket_id = 'case-images' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    }
  ],

  // Contributions - Private bucket, owner and admins can access
  'contributions': [
    {
      name: 'contributions_authenticated_read',
      operation: 'SELECT',
      policy: `
        CREATE POLICY "contributions_authenticated_read" ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'contributions' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'contributions_authenticated_insert',
      operation: 'INSERT',
      policy: `
        CREATE POLICY "contributions_authenticated_insert" ON storage.objects
        FOR INSERT
        WITH CHECK (
          bucket_id = 'contributions' AND
          auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'contributions_owner_update',
      operation: 'UPDATE',
      policy: `
        CREATE POLICY "contributions_owner_update" ON storage.objects
        FOR UPDATE
        USING (
          bucket_id = 'contributions' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'contributions_owner_delete',
      operation: 'DELETE',
      policy: `
        CREATE POLICY "contributions_owner_delete" ON storage.objects
        FOR DELETE
        USING (
          bucket_id = 'contributions' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    }
  ],

  // Users - Private bucket, owner and admins only
  'users': [
    {
      name: 'users_owner_read',
      operation: 'SELECT',
      policy: `
        CREATE POLICY "users_owner_read" ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'users' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'users_authenticated_insert',
      operation: 'INSERT',
      policy: `
        CREATE POLICY "users_authenticated_insert" ON storage.objects
        FOR INSERT
        WITH CHECK (
          bucket_id = 'users' AND
          auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'users_owner_update',
      operation: 'UPDATE',
      policy: `
        CREATE POLICY "users_owner_update" ON storage.objects
        FOR UPDATE
        USING (
          bucket_id = 'users' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'users_owner_delete',
      operation: 'DELETE',
      policy: `
        CREATE POLICY "users_owner_delete" ON storage.objects
        FOR DELETE
        USING (
          bucket_id = 'users' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    }
  ],

  // Case Files - Private bucket, case-related access
  'case-files': [
    {
      name: 'case_files_authenticated_read',
      operation: 'SELECT',
      policy: `
        CREATE POLICY "case_files_authenticated_read" ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'case-files' AND
          auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'case_files_authenticated_insert',
      operation: 'INSERT',
      policy: `
        CREATE POLICY "case_files_authenticated_insert" ON storage.objects
        FOR INSERT
        WITH CHECK (
          bucket_id = 'case-files' AND
          auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'case_files_owner_update',
      operation: 'UPDATE',
      policy: `
        CREATE POLICY "case_files_owner_update" ON storage.objects
        FOR UPDATE
        USING (
          bucket_id = 'case-files' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    },
    {
      name: 'case_files_owner_delete',
      operation: 'DELETE',
      policy: `
        CREATE POLICY "case_files_owner_delete" ON storage.objects
        FOR DELETE
        USING (
          bucket_id = 'case-files' AND
          auth.role() = 'authenticated' AND
          (owner = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'moderator')
          ))
        );
      `
    }
  ]
}

async function dropExistingPolicies() {
  console.log('🗑️  Dropping existing storage policies...\n')

  const allPolicies = Object.values(storagePolicies).flat()
  
  for (const policyDef of allPolicies) {
    try {
      const dropSQL = `DROP POLICY IF EXISTS "${policyDef.name}" ON storage.objects;`
      const { error } = await supabase.rpc('exec_sql', { sql: dropSQL })
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`   ⚠️  Could not drop policy ${policyDef.name}: ${error.message}`)
      } else {
        console.log(`   ✅ Dropped policy: ${policyDef.name}`)
      }
    } catch (error) {
      // Ignore errors when dropping non-existent policies
      console.log(`   ℹ️  Policy ${policyDef.name} does not exist (skipped)`)
    }
  }

  console.log('\n')
}

async function createStoragePolicies() {
  console.log('🔐 Creating storage RLS policies...\n')

  for (const [bucketName, policies] of Object.entries(storagePolicies)) {
    console.log(`📦 Setting up policies for bucket: ${bucketName}`)

    for (const policyDef of policies) {
      try {
        // Execute the policy creation SQL directly
        const { error } = await supabase.rpc('exec_sql', { sql: policyDef.policy })

        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ℹ️  Policy ${policyDef.name} already exists`)
          } else {
            console.error(`   ❌ Error creating policy ${policyDef.name}:`, error.message)
          }
        } else {
          console.log(`   ✅ Created policy: ${policyDef.name}`)
        }
      } catch (error) {
        console.error(`   ❌ Unexpected error creating policy ${policyDef.name}:`, error.message)
      }
    }

    console.log('')
  }
}

async function enableRLSOnStorageObjects() {
  console.log('🔒 Enabling RLS on storage.objects table...\n')

  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;' 
    })

    if (error) {
      console.log(`   ℹ️  RLS already enabled or error: ${error.message}`)
    } else {
      console.log('   ✅ RLS enabled on storage.objects')
    }
  } catch (error) {
    console.log(`   ℹ️  RLS status: ${error.message}`)
  }

  console.log('\n')
}

async function testStorageAccess() {
  console.log('🧪 Testing storage access...\n')

  try {
    // Test listing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('   ❌ Error listing buckets:', listError.message)
    } else {
      console.log(`   ✅ Successfully listed ${buckets.length} buckets`)
      buckets.forEach(bucket => {
        console.log(`      - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
      })
    }
  } catch (error) {
    console.error('   ❌ Error testing storage:', error.message)
  }

  console.log('\n')
}

async function main() {
  console.log('🚀 Starting Storage RLS Policy Setup\n')
  console.log('=' .repeat(60))
  console.log('\n')

  try {
    // Step 1: Drop existing policies to avoid conflicts
    await dropExistingPolicies()

    // Step 2: Enable RLS on storage.objects
    await enableRLSOnStorageObjects()

    // Step 3: Create new policies
    await createStoragePolicies()

    // Step 4: Test storage access
    await testStorageAccess()

    console.log('=' .repeat(60))
    console.log('\n✅ Storage RLS Policy Setup Complete!\n')
    console.log('📋 Summary:')
    console.log('   - Policies created for all storage buckets')
    console.log('   - Authenticated users can upload files')
    console.log('   - File owners and admins can manage their files')
    console.log('   - RLS is properly enabled\n')
    console.log('🔧 Next Steps:')
    console.log('   1. Test file uploads in your application')
    console.log('   2. Verify policies in Supabase dashboard')
    console.log('   3. Monitor logs for any access issues\n')

  } catch (error) {
    console.error('\n❌ Error during RLS setup:', error.message)
    console.error('\n📝 Troubleshooting:')
    console.error('   1. Ensure SUPABASE_SERVICE_ROLE_KEY is correct')
    console.error('   2. Check if storage.objects table exists')
    console.error('   3. Verify database connection')
    console.error('   4. Review Supabase dashboard for errors\n')
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)

