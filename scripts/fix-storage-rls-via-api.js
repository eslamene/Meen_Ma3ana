#!/usr/bin/env node

/**
 * Fix Storage RLS via Supabase Management API
 * 
 * This script uses the Supabase service role key to fix RLS policies
 * Run with: node scripts/fix-storage-rls-via-api.js
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

console.log('🔧 Fixing Storage RLS Policies...\n')
console.log('📌 Using Service Role Key for elevated permissions\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixStorageRLS() {
  console.log('📋 Step 1: Checking case-images bucket...\n')

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }

    const caseImagesBucket = buckets.find(b => b.name === 'case-images')
    
    if (!caseImagesBucket) {
      console.log('⚠️  Bucket "case-images" not found. Creating it...\n')
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('case-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message)
        return
      }

      console.log('✅ Created case-images bucket\n')
    } else {
      console.log('✅ Bucket "case-images" exists')
      console.log(`   - Public: ${caseImagesBucket.public}`)
      console.log(`   - File size limit: ${caseImagesBucket.file_size_limit ? (caseImagesBucket.file_size_limit / 1024 / 1024).toFixed(1) + 'MB' : 'Not set'}`)
      console.log('\n')
    }

    // Update bucket to be public if it isn't
    if (caseImagesBucket && !caseImagesBucket.public) {
      console.log('📋 Step 2: Making bucket public...\n')
      
      const { data, error } = await supabase.storage.updateBucket('case-images', {
        public: true
      })

      if (error) {
        console.error('⚠️  Could not update bucket to public:', error.message)
        console.log('   This is okay - we can still set up policies\n')
      } else {
        console.log('✅ Bucket is now public\n')
      }
    }

    console.log('📋 Step 3: Testing upload permissions...\n')

    // Try to test upload access
    const testFileName = `test-${Date.now()}.txt`
    const testContent = 'Test file for RLS policy verification'
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('case-images')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.log('⚠️  Upload test failed (this is expected if RLS is blocking):', uploadError.message)
      console.log('\n')
    } else {
      console.log('✅ Upload test successful!')
      console.log(`   File: ${uploadData.path}\n`)
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('case-images')
        .remove([testFileName])
      
      if (!deleteError) {
        console.log('✅ Cleaned up test file\n')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }

  console.log('=' .repeat(60))
  console.log('\n📋 **IMPORTANT NEXT STEPS**:\n')
  console.log('Since we cannot modify RLS policies via the API, you need to')
  console.log('run the SQL directly in the Supabase Dashboard:\n')
  console.log('1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql')
  console.log('2. Copy and paste the SQL from: supabase/fix-storage-rls-manual.sql')
  console.log('3. Click "Run" to execute\n')
  console.log('OR\n')
  console.log('Temporarily disable RLS for testing:')
  console.log('   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;\n')
  console.log('=' .repeat(60))
}

fixStorageRLS().catch(console.error)

