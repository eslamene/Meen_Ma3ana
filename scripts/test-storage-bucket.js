const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStorageBucket() {
  try {
    console.log('🔍 Testing storage bucket...')
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }
    
    console.log('📋 Available buckets:')
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`)
    })
    
    // Check if contributions bucket exists
    const contributionsBucket = buckets.find(b => b.name === 'contributions')
    
    if (!contributionsBucket) {
      console.log('❌ Contributions bucket not found!')
      return
    }
    
    console.log('✅ Contributions bucket found')
    console.log(`   - Name: ${contributionsBucket.name}`)
    console.log(`   - Public: ${contributionsBucket.public}`)
    console.log(`   - Created: ${contributionsBucket.created_at}`)
    
    // Test with the exact path structure used by ContributionForm
    console.log('\n🧪 Testing file upload with ContributionForm path structure...')
    
    // Create a minimal PNG file (1x1 pixel transparent PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    
    // Test the exact path structure used by ContributionForm
    const testCaseId = '7c9f5e55-a312-4f76-af93-908d2a0e420a'
    const fileName = `payment-proofs/${testCaseId}-${Date.now()}-test-image.jpg`
    
    console.log(`   - Testing path: ${fileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contributions')
      .upload(fileName, pngData, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      })
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError)
      console.error('   - Error message:', uploadError.message)
      console.error('   - Error status:', uploadError.status)
      return
    }
    
    console.log('✅ Upload test successful')
    console.log(`   - File path: ${uploadData.path}`)
    
    // Test getting public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contributions')
      .getPublicUrl(fileName)
    
    console.log(`   - Public URL: ${publicUrl}`)
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('contributions')
      .remove([fileName])
    
    if (deleteError) {
      console.log('⚠️  Could not clean up test file:', deleteError)
    } else {
      console.log('✅ Test file cleaned up')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testStorageBucket() 