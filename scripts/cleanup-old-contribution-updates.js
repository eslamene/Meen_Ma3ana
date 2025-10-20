import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupOldContributionUpdates() {
  try {
    console.log('🔄 Starting cleanup of old contribution updates...')
    
    // Delete old contribution-related updates
    const { error } = await supabase
      .from('case_updates')
      .delete()
      .or('title.ilike.%Latest Donation%,title.ilike.%Donation%,content.ilike.%donation%,content.ilike.%contributed%')
    
    if (error) {
      throw error
    }
    
    console.log('✅ Successfully cleaned up old contribution updates')
  } catch (error) {
    console.error('❌ Error cleaning up old contribution updates:', error)
    process.exit(1)
  }
}

cleanupOldContributionUpdates() 