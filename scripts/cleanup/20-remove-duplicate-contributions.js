/**
 * Remove Duplicate Contributions
 * 
 * Removes duplicate contributions, keeping the oldest one from each group
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
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function removeDuplicates() {
  console.log('🗑️  Removing duplicate contributions...\n')
  
  // Get all contributions
  const { data: contributions, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      donor_id,
      case_id,
      created_at,
      status
    `)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('❌ Error fetching contributions:', error.message)
    process.exit(1)
  }
  
  // Group by case_id, amount, donor_id, and date (within same day)
  const groups = new Map()
  
  contributions?.forEach(contrib => {
    const date = new Date(contrib.created_at)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    const key = `${contrib.case_id}:${contrib.amount}:${contrib.donor_id}:${dateKey}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(contrib)
  })
  
  // Find duplicates and keep the oldest one
  const toDelete = []
  let duplicateCount = 0
  
  groups.forEach((group, key) => {
    if (group.length > 1) {
      // Sort by created_at (oldest first)
      group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      // Keep the first (oldest), delete the rest
      const keep = group[0]
      const duplicates = group.slice(1)
      
      console.log(`📋 Group: ${group.length} contributions (keeping oldest: ${keep.id})`)
      duplicates.forEach(dup => {
        toDelete.push(dup.id)
        duplicateCount++
        console.log(`   🗑️  Will delete: ${dup.id} (created: ${dup.created_at})`)
      })
      console.log()
    }
  })
  
  if (toDelete.length === 0) {
    console.log('✅ No duplicates found\n')
    return
  }
  
  console.log(`⚠️  Found ${duplicateCount} duplicate contributions to delete\n`)
  console.log('⚠️  WARNING: This will permanently delete these contributions!')
  console.log('⚠️  Make sure you have a backup before proceeding.\n')
  
  // Delete approval statuses first (foreign key constraint)
  console.log('🗑️  Step 1: Deleting approval statuses for duplicates...')
  const { error: approvalError } = await supabase
    .from('contribution_approval_status')
    .delete()
    .in('contribution_id', toDelete)
  
  if (approvalError) {
    console.error('   ⚠️  Error deleting approval statuses:', approvalError.message)
  } else {
    console.log(`   ✓ Deleted approval statuses for ${toDelete.length} contributions\n`)
  }
  
  // Delete notifications
  console.log('🗑️  Step 2: Deleting notifications for duplicates...')
  const { error: notifError } = await supabase
    .from('notifications')
    .delete()
    .in('data->contribution_id', toDelete)
  
  if (notifError) {
    console.error('   ⚠️  Error deleting notifications:', notifError.message)
  } else {
    console.log(`   ✓ Deleted notifications for duplicates\n`)
  }
  
  // Delete contributions
  console.log('🗑️  Step 3: Deleting duplicate contributions...')
  const { error: deleteError } = await supabase
    .from('contributions')
    .delete()
    .in('id', toDelete)
  
  if (deleteError) {
    console.error('❌ Error deleting contributions:', deleteError.message)
    process.exit(1)
  }
  
  console.log(`✅ Deleted ${toDelete.length} duplicate contributions\n`)
  
  // Verify
  const { count: remainingCount } = await supabase
    .from('contributions')
    .select('*', { count: 'exact', head: true })
  
  console.log('='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Deleted: ${toDelete.length} duplicate contributions`)
  console.log(`📊 Remaining contributions: ${remainingCount || 0}`)
  console.log('='.repeat(60) + '\n')
}

removeDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

