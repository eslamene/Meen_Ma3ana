import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

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

const bucketConfig = {
  name: 'beneficiaries',
  public: false,
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  fileSizeLimit: 5242880, // 5MB
  description: 'Beneficiary documents and files'
}

async function createBeneficiariesBucket() {
  try {
    console.log('🚀 Creating beneficiaries storage bucket...\n')
    console.log(`   Name: ${bucketConfig.name}`)
    console.log(`   Public: ${bucketConfig.public}`)
    console.log(`   Allowed types: ${bucketConfig.allowedMimeTypes.join(', ')}`)
    console.log(`   Size limit: ${bucketConfig.fileSizeLimit / 1024 / 1024}MB\n`)
    
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
        console.error(`❌ Error creating bucket:`, error.message)
        return false
      }
    }

    console.log(`✅ Successfully created bucket '${bucketConfig.name}'`)
    console.log('\n📝 Next steps:')
    console.log('1. Verify the bucket in Supabase dashboard (Storage → Buckets)')
    console.log('2. Test document upload in the beneficiary edit page')
    return true
  } catch (error) {
    console.error(`❌ Unexpected error:`, error.message)
    return false
  }
}

// Run the setup
createBeneficiariesBucket()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Bucket setup complete!')
    } else {
      console.log('\n⚠️  Bucket creation failed. See errors above.')
      process.exit(1)
    }
  })
  .catch(console.error)

