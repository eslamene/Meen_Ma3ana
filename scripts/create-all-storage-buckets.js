const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env.local file and ensure these variables are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define all the storage buckets needed by the application
const buckets = [
  {
    name: 'case-images',
    description: 'Images for cases and case updates',
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    fileSizeLimit: 5242880 // 5MB
  },
  {
    name: 'contributions',
    description: 'Payment proof files for contributions',
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  },
  {
    name: 'users',
    description: 'User profile images and documents',
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    fileSizeLimit: 5242880 // 5MB
  },
  {
    name: 'sponsor_applications',
    description: 'Documents for sponsor applications',
    public: false,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  },
  {
    name: 'recurring_contributions',
    description: 'Documents for recurring contributions',
    public: false,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  }
]

async function createStorageBuckets() {
  console.log('🚀 Creating all required storage buckets...\n')

  for (const bucket of buckets) {
    try {
      console.log(`🪣 Creating bucket: ${bucket.name}`)
      console.log(`   Description: ${bucket.description}`)
      console.log(`   Public: ${bucket.public}`)
      console.log(`   Allowed types: ${bucket.allowedMimeTypes.join(', ')}`)
      console.log(`   Size limit: ${(bucket.fileSizeLimit / 1024 / 1024).toFixed(1)}MB`)

      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.allowedMimeTypes,
        fileSizeLimit: bucket.fileSizeLimit
      })

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ✅ Bucket '${bucket.name}' already exists`)
        } else {
          console.error(`   ❌ Error creating bucket '${bucket.name}':`, error.message)
        }
      } else {
        console.log(`   ✅ Successfully created bucket '${bucket.name}'`)
      }

      console.log('') // Empty line for readability

    } catch (error) {
      console.error(`   ❌ Unexpected error creating bucket '${bucket.name}':`, error.message)
      console.log('')
    }
  }

  console.log('🎉 Storage bucket creation process completed!')
  console.log('\n📋 Summary of buckets:')
  console.log('   - case-images: For case and case update images')
  console.log('   - contributions: For payment proof files')
  console.log('   - users: For user profile images')
  console.log('   - sponsor_applications: For sponsor application documents')
  console.log('   - recurring_contributions: For recurring contribution documents')
  
  console.log('\n🔧 Next steps:')
  console.log('   1. Verify buckets were created in your Supabase dashboard')
  console.log('   2. Test file uploads in your application')
  console.log('   3. Configure RLS policies if needed for private buckets')
}

createStorageBuckets()
  .catch(console.error) 