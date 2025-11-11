/**
 * Step 1: Clear All Data
 * 
 * This script clears all cases, contributions, notifications, and approval statuses
 * from the database. User accounts are NOT deleted.
 * 
 * WARNING: This will permanently delete all contribution-related data!
 * 
 * Run this before importing new data.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearAllData() {
  console.log('🗑️  Clearing all cases, contributions, and notifications...\n')
  
  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete notifications related to contributions/cases
    console.log('   Step 1: Clearing notifications...')
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (notifError) {
      console.error('   ⚠️  Error clearing notifications:', notifError.message)
    } else {
      console.log('   ✓ Cleared notifications')
    }
    
    // 2. Delete contribution approval statuses
    console.log('   Step 2: Clearing approval statuses...')
    const { error: approvalError } = await supabase
      .from('contribution_approval_status')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (approvalError) {
      console.error('   ⚠️  Error clearing approval statuses:', approvalError.message)
    } else {
      console.log('   ✓ Cleared contribution approval statuses')
    }
    
    // 3. Delete contributions
    console.log('   Step 3: Clearing contributions...')
    const { error: contribError } = await supabase
      .from('contributions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (contribError) {
      console.error('   ⚠️  Error clearing contributions:', contribError.message)
    } else {
      console.log('   ✓ Cleared contributions')
    }
    
    // 4. Delete case-related data
    console.log('   Step 4: Clearing case-related data...')
    const { error: caseImagesError } = await supabase
      .from('case_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    const { error: caseUpdatesError } = await supabase
      .from('case_updates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    const { error: caseStatusError } = await supabase
      .from('case_status_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    // 5. Delete cases
    console.log('   Step 5: Clearing cases...')
    const { error: casesError } = await supabase
      .from('cases')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (casesError) {
      console.error('   ⚠️  Error clearing cases:', casesError.message)
    } else {
      console.log('   ✓ Cleared cases and related data')
    }
    
    console.log('\n✅ All data cleared successfully!\n')
    console.log('💡 Note: User accounts were NOT deleted.')
    console.log('   Run scripts/02-import-contributions-with-users.js next.\n')
    
  } catch (error) {
    console.error('❌ Error clearing data:', error)
    throw error
  }
}

clearAllData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to clear data:', error)
    process.exit(1)
  })

