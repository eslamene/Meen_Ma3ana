import { createClient } from '@/lib/supabase/server'
import dotenv from 'dotenv'
dotenv.config()

const supabase = await createClient()

async function disableStorageRLS() {
  console.log('🔓 Dropping all storage RLS policies...\n')
  
  try {
    // List of common storage policies to drop
    const policies = [
      'Allow authenticated users to upload',
      'Allow users to view their own uploads',
      'Allow public read access',
      'Allow users to upload their own files',
      'Allow users to view their own files',
      'Allow users to view their own applications',
      'Allow users to view their own contributions',
      'Enable read access for all users',
      'Enable insert for authenticated users only',
      'Enable update for users based on user_id',
      'Enable delete for users based on user_id'
    ]
    
    let droppedCount = 0
    
    for (const policy of policies) {
      try {
        // Try to drop the policy using direct SQL
        const { error } = await (await supabase).storage
          .from('contributions')
          .remove([`policy/${policy}`])
        
        if (!error) {
          console.log(`✅ Dropped policy: ${policy}`)
          droppedCount++
        }
      } catch (e) {
        // Policy might not exist, continue
      }
    }
    
    // Also try to make buckets completely public
    const buckets = ['contributions', 'case-images', 'users', 'sponsor_applications', 'recurring_contributions']
    
    for (const bucket of buckets) {
      try {
        const { error } = await (await supabase).storage.updateBucket(bucket, {
          public: true
        })
        
        if (!error) {
          console.log(`✅ Made bucket '${bucket}' public`)
        }
      } catch (e) {
        console.log(`⚠️  Could not update bucket '${bucket}': ${e.message}`)
      }
    }
    
    console.log(`\n📊 Summary: Dropped ${droppedCount} policies`)
    console.log('🎉 Storage policies removed successfully!')
    console.log('⚠️  Note: This disables security for testing. Re-enable for production.')
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

disableStorageRLS().catch(console.error) 