const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const buckets = [
  {
    name: 'case-images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    fileSizeLimit: 5242880, // 5MB
    description: 'Images for case documents and evidence'
  },
  {
    name: 'contributions',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    fileSizeLimit: 5242880, // 5MB
    description: 'Payment proof documents for contributions'
  },
  {
    name: 'users',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    fileSizeLimit: 2097152, // 2MB
    description: 'User profile pictures and documents'
  },
  {
    name: 'sponsor_applications',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    fileSizeLimit: 10485760, // 10MB
    description: 'Sponsor application documents'
  },
  {
    name: 'recurring_contributions',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    fileSizeLimit: 5242880, // 5MB
    description: 'Recurring contribution documents'
  }
]

async function createBucket(bucketConfig) {
  try {
    console.log(`Creating bucket: ${bucketConfig.name}...`)
    
    const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      allowedMimeTypes: bucketConfig.allowedMimeTypes,
      fileSizeLimit: bucketConfig.fileSizeLimit
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`✅ Bucket '${bucketConfig.name}' already exists`)
        return true
      } else {
        console.error(`❌ Error creating bucket '${bucketConfig.name}':`, error.message)
        return false
      }
    }

    console.log(`✅ Successfully created bucket '${bucketConfig.name}'`)
    return true
  } catch (error) {
    console.error(`❌ Unexpected error creating bucket '${bucketConfig.name}':`, error.message)
    return false
  }
}

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage Buckets...\n')
  
  let successCount = 0
  let totalCount = buckets.length

  for (const bucket of buckets) {
    const success = await createBucket(bucket)
    if (success) successCount++
    console.log(`   ${bucket.description}`)
    console.log(`   - Public: ${bucket.public}`)
    console.log(`   - Allowed types: ${bucket.allowedMimeTypes.join(', ')}`)
    console.log(`   - Size limit: ${bucket.fileSizeLimit / 1024 / 1024}MB\n`)
  }

  console.log(`📊 Summary: ${successCount}/${totalCount} buckets ready`)
  
  if (successCount === totalCount) {
    console.log('🎉 All storage buckets are set up successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Test file uploads in your application')
    console.log('2. Verify bucket permissions in Supabase dashboard')
    console.log('3. Check RLS policies if needed')
  } else {
    console.log('⚠️  Some buckets failed to create. Check the errors above.')
  }
}

// Run the setup
setupStorageBuckets().catch(console.error) 