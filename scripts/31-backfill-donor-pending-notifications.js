/**
 * Backfill Donor Pending Notifications
 * 
 * This script creates contribution_pending notifications for donors
 * for all their existing approved contributions.
 * 
 * This ensures donors can see both pending and approved notifications
 * for their contributions.
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

async function backfillDonorPendingNotifications() {
  console.log('📬 Backfilling donor pending notifications...\n')
  
  // Step 1: Get all approved contributions with donor info
  console.log('📊 Step 1: Fetching approved contributions...')
  const { data: contributions, error: contribsError } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      donor_id,
      case_id,
      created_at,
      cases (
        title_en,
        title_ar
      )
    `)
    .eq('status', 'approved')
  
  if (contribsError) {
    console.error('❌ Error fetching contributions:', contribsError.message)
    process.exit(1)
  }
  
  console.log(`   ✓ Found ${contributions.length} approved contributions\n`)
  
  // Step 2: Check existing notifications to avoid duplicates
  console.log('🔍 Step 2: Checking existing notifications...')
  const { data: existingNotifications, error: existingNotifError } = await supabase
    .from('notifications')
    .select('data, recipient_id, type')
    .eq('type', 'contribution_pending')
  
  if (existingNotifError) {
    console.error('❌ Error fetching existing notifications:', existingNotifError.message)
    process.exit(1)
  }
  
  // Create a set of existing pending notifications for donors
  const existingDonorPendingNotifs = new Set()
  existingNotifications
    .filter(n => n.data && n.data.contribution_id && n.type === 'contribution_pending')
    .forEach(n => {
      const contribId = n.data.contribution_id
      const recipientId = n.recipient_id
      existingDonorPendingNotifs.add(`${contribId}-${recipientId}-pending`)
    })
  
  console.log(`   ✓ Found ${existingDonorPendingNotifs.size} existing donor pending notifications\n`)
  
  // Step 3: Prepare pending notifications for donors
  console.log('📝 Step 3: Creating pending notifications for donors...\n')
  const notificationsToInsert = []
  let skippedCount = 0
  
  for (const contrib of contributions) {
    if (!contrib.donor_id) continue
    
    const amount = parseFloat(contrib.amount || '0')
    const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
    const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
    
    // Check if pending notification already exists for this donor
    const key = `${contrib.id}-${contrib.donor_id}-pending`
    if (existingDonorPendingNotifs.has(key)) {
      skippedCount++
      continue
    }
    
    // Create pending notification for donor
    notificationsToInsert.push({
      type: 'contribution_pending',
      recipient_id: contrib.donor_id,
      title: 'Contribution Submitted',
      message: `Your contribution of ${amount.toLocaleString()} EGP for "${caseTitle}" has been submitted and is under review.`,
      data: {
        contribution_id: contrib.id,
        amount: amount,
        case_title: caseTitle
      },
      read: false,
      created_at: contrib.created_at // Use contribution's created_at
    })
  }
  
  console.log(`   📊 Prepared ${notificationsToInsert.length} pending notifications to create`)
  console.log(`   ⚠️  Skipped ${skippedCount} (already exist)\n`)
  
  if (notificationsToInsert.length === 0) {
    console.log('✅ All donor pending notifications already exist!\n')
    return
  }
  
  // Step 4: Insert notifications in batches
  console.log('💾 Step 4: Inserting notifications...')
  const batchSize = 100
  let insertedCount = 0
  for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
    const batch = notificationsToInsert.slice(i, i + batchSize)
    const { error: insertNotifError } = await supabase
      .from('notifications')
      .insert(batch)
    
    if (insertNotifError) {
      console.error(`   ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertNotifError.message)
    } else {
      insertedCount += batch.length
      process.stdout.write(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${insertedCount}/${notificationsToInsert.length})\r`)
    }
  }
  process.stdout.write('\n') // New line after progress
  console.log(`   ✅ Inserted ${insertedCount} notifications\n`)
  
  // Step 5: Verify notifications
  console.log('🔍 Step 5: Verifying notifications...')
  const { count: totalPendingNotifs } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'contribution_pending')
  
  const { count: totalApprovedNotifs } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'contribution_approved')
  
  console.log(`   ✓ Total pending notifications: ${totalPendingNotifs}`)
  console.log(`   ✓ Total approved notifications: ${totalApprovedNotifs}\n`)
  
  console.log('='.repeat(60))
  console.log('📊 BACKFILL SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Processed ${contributions.length} contributions`)
  console.log(`✅ Created ${insertedCount} pending notifications for donors`)
  console.log(`⚠️  Skipped ${skippedCount} (already exist)`)
  console.log(`📬 Total pending notifications: ${totalPendingNotifs}`)
  console.log(`✅ Total approved notifications: ${totalApprovedNotifs}`)
  console.log('='.repeat(60) + '\n')
}

backfillDonorPendingNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error during backfill:', error)
    process.exit(1)
  })
