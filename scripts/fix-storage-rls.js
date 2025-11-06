import { createClient } from '@/lib/supabase/server'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = await createClient(supabaseUrl, supabaseServiceKey)

async function disableRLSForTesting() {
  console.log('🔓 Disabling RLS for storage buckets...\n')
  
  const buckets = ['contributions', 'case-images', 'users', 'sponsor_applications', 'recurring_contributions']
  
  for (const bucket of buckets) {
    try {
      console.log(`Disabling RLS for bucket: ${bucket}...`)
      
      const { error } = await (await supabase).storage.updateBucket(bucket, {
        public: true
      })

      if (error) {
        console.error(`❌ Error for bucket '${bucket}':`, error.message)
      } else {
        console.log(`✅ Successfully updated bucket '${bucket}'`)
      }
    } catch (error) {
      console.error(`❌ Unexpected error for bucket '${bucket}':`, error.message)
    }
  }
  
  console.log('\n🎉 Storage buckets updated!')
  console.log('⚠️  Note: This disables security for testing. Re-enable for production.')
}

disableRLSForTesting().catch(console.error) 