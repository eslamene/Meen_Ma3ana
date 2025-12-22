/**
 * Verify Beneficiaries Storage Bucket Setup
 * Checks if the bucket exists and has the correct policies
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyBucket() {
  console.log('🔍 Verifying beneficiaries storage bucket...\n')

  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message)
      return false
    }

    const beneficiariesBucket = buckets.find(b => b.name === 'beneficiaries')

    if (!beneficiariesBucket) {
      console.error('❌ Bucket "beneficiaries" does not exist!')
      console.log('\n📝 To create the bucket, run:')
      console.log('   node scripts/61-create-beneficiaries-bucket.js')
      return false
    }

    console.log('✅ Bucket "beneficiaries" exists')
    console.log('   - Public:', beneficiariesBucket.public ? 'Yes' : 'No (Private)')
    console.log('   - File size limit:', beneficiariesBucket.file_size_limit ? `${beneficiariesBucket.file_size_limit} bytes` : 'No limit')
    console.log('   - Allowed MIME types:', beneficiariesBucket.allowed_mime_types?.join(', ') || 'All types')

    // Try to list files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('beneficiaries')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('❌ Error listing files:', filesError.message)
      console.log('\n⚠️  This might indicate a policy issue. Check storage policies.')
      return false
    }

    console.log(`\n📁 Files in bucket: ${files?.length || 0}`)
    if (files && files.length > 0) {
      console.log('   Recent files:')
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`)
      })
    } else {
      console.log('   (Bucket is empty)')
    }

    // Test upload (small test file)
    console.log('\n🧪 Testing upload...')
    const testFileName = `test-${Date.now()}.txt`
    const testContent = 'This is a test file for verifying upload permissions.'
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('beneficiaries')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      })

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message)
      console.log('\n⚠️  This indicates a storage policy issue.')
      console.log('   Run: supabase/migrations/056_create_beneficiaries_storage_policies.sql')
      return false
    }

    console.log('✅ Upload test successful!')
    console.log(`   File: ${uploadData.path}`)

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('beneficiaries')
      .remove([testFileName])

    if (deleteError) {
      console.warn('⚠️  Could not delete test file:', deleteError.message)
    } else {
      console.log('✅ Test file cleaned up')
    }

    console.log('\n✅ All checks passed! The bucket is properly configured.')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

verifyBucket().then(success => {
  process.exit(success ? 0 : 1)
})

