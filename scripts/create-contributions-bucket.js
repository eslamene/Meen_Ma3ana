const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.error('Get it from: https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw/settings/api')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createContributionsBucket() {
  try {
    console.log('🪣 Creating contributions bucket...')
    
    const { data, error } = await supabase.storage.createBucket('contributions', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket "contributions" already exists')
      } else {
        console.error('❌ Error creating bucket:', error.message)
      }
    } else {
      console.log('✅ Successfully created "contributions" bucket')
    }

    console.log('\n📋 Bucket configuration:')
    console.log('   - Name: contributions')
    console.log('   - Public: true')
    console.log('   - File size limit: 10MB')
    console.log('   - Allowed types: image/png, image/jpeg, image/jpg, application/pdf')
    
    console.log('\n🎉 You can now upload payment proof files!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createContributionsBucket() 