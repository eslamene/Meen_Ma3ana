import { createClient } from '@/lib/supabase/client'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient()

const buckets = [
  {
    name: 'case-files',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav'],
    fileSizeLimit: 52428800, // 50MB
    description: 'All case files including images, documents, videos, and audio'
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
  },
  {
    name: 'beneficiaries',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    fileSizeLimit: 5242880, // 5MB
    description: 'Beneficiary documents and files'
  }
]

async function createBucket(bucketConfig) {
  try {
    console.log(`Creating bucket: ${bucketConfig.name}...`)
    
    const { error } = await supabase.storage.createBucket(bucketConfig.name, {
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