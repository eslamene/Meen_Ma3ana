const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUpload() {
  console.log('🧪 Testing file upload functionality...\n')
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ])
    
    const fileName = `test-${Date.now()}.png`
    
    console.log(`Uploading test image: ${fileName}`)
    
    const { data, error } = await supabase.storage
      .from('contributions')
      .upload(`test/${fileName}`, pngHeader, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Upload failed:', error.message)
      return false
    }

    console.log('✅ Upload successful!')
    console.log('📁 File path:', data.path)
    
    // Test getting the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contributions')
      .getPublicUrl(data.path)
    
    console.log('🔗 Public URL:', publicUrl)
    
    // Clean up - delete the test file
    const { error: deleteError } = await supabase.storage
      .from('contributions')
      .remove([data.path])
    
    if (deleteError) {
      console.log('⚠️  Could not delete test file:', deleteError.message)
    } else {
      console.log('🧹 Test file cleaned up')
    }
    
    console.log('\n🎉 Upload test completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

testUpload().catch(console.error) 