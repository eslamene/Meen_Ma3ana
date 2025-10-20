const { createClient } = require('@supabase/supabase-js')

// You'll need to add your service role key to .env.local
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  console.log('📝 Please add your service role key to .env.local:')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
  console.log('   You can find this in your Supabase dashboard under Settings > API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createStorageBucket() {
  try {
    console.log('🪣 Creating case-images bucket...')
    
    const { data, error } = await supabase.storage.createBucket('case-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ case-images bucket already exists')
      } else {
        console.error('❌ Error creating bucket:', error)
      }
    } else {
      console.log('✅ case-images bucket created successfully')
    }

    // List all buckets to verify
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
    } else {
      console.log('📋 Available buckets:')
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (public: ${bucket.public})`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createStorageBucket() 