/**
 * Backfill Notifications for All Contributions
 * 
 * Creates notifications for all existing contributions:
 * 1. Admin notifications when contribution was created (contribution_pending)
 * 2. Donor notifications when contribution was approved (contribution_approved)
 * 3. Links notifications to contribution_approval_status records
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

async function backfillNotifications() {
  console.log('📬 Backfilling notifications for all contributions...\n')
  
  // Step 1: Get all contributions with their related data
  console.log('📊 Step 1: Fetching all contributions...')
  const { data: contributions, error: contribsError } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      status,
      donor_id,
      case_id,
      created_at,
      cases (
        id,
        title_en,
        title_ar
      )
    `)
    .order('created_at', { ascending: true })
  
  if (contribsError) {
    console.error('❌ Error fetching contributions:', contribsError.message)
    process.exit(1)
  }
  
  console.log(`   ✓ Found ${contributions?.length || 0} contributions\n`)
  
  if (!contributions || contributions.length === 0) {
    console.log('⚠️  No contributions found. Exiting.')
    return
  }
  
  // Step 2: Get all approval statuses
  console.log('✅ Step 2: Fetching approval statuses...')
  const { data: approvalStatuses, error: approvalError } = await supabase
    .from('contribution_approval_status')
    .select('contribution_id, status, admin_id, created_at')
  
  if (approvalError) {
    console.error('❌ Error fetching approval statuses:', approvalError.message)
    process.exit(1)
  }
  
  // Create a map of contribution_id -> approval status
  const approvalMap = new Map()
  approvalStatuses?.forEach(approval => {
    if (!approvalMap.has(approval.contribution_id)) {
      approvalMap.set(approval.contribution_id, approval)
    }
  })
  
  console.log(`   ✓ Found ${approvalStatuses?.length || 0} approval statuses\n`)
  
  // Step 3: Get all admin users
  console.log('👥 Step 3: Fetching admin users...')
  const { data: adminRoles, error: adminRolesError } = await supabase
    .from('admin_user_roles')
    .select('user_id, admin_roles!inner(name)')
    .eq('is_active', true)
    .in('admin_roles.name', ['admin', 'super_admin'])
  
  if (adminRolesError) {
    console.error('❌ Error fetching admin users:', adminRolesError.message)
    process.exit(1)
  }
  
  const adminUserIds = [...new Set(adminRoles?.map(r => r.user_id) || [])]
  console.log(`   ✓ Found ${adminUserIds.length} admin users\n`)
  
  // Step 4: Check existing notifications to avoid duplicates
  console.log('🔍 Step 4: Checking existing notifications...')
  const { data: existingNotifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, type, recipient_id, data')
    .in('type', ['contribution_pending', 'contribution_approved', 'contribution_rejected'])
  
  if (notifError) {
    console.error('❌ Error fetching existing notifications:', notifError.message)
    process.exit(1)
  }
  
  // Create a set of existing notification keys (contribution_id + type + recipient_id)
  const existingNotifKeys = new Set()
  existingNotifications?.forEach(notif => {
    const contribId = notif.data?.contribution_id
    if (contribId) {
      existingNotifKeys.add(`${contribId}:${notif.type}:${notif.recipient_id}`)
    }
  })
  
  console.log(`   ✓ Found ${existingNotifications?.length || 0} existing contribution notifications\n`)
  
  // Step 5: Create notifications
  console.log('📝 Step 5: Creating notifications...\n')
  
  const notificationsToInsert = []
  let pendingCount = 0
  let approvedCount = 0
  let skippedCount = 0
  
  for (const contrib of contributions) {
    const contribId = contrib.id
    const amount = parseFloat(contrib.amount || '0')
    const donorId = contrib.donor_id
    const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
    const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
    const contribDate = contrib.created_at
    
    // 1. Create admin notifications for contribution creation (contribution_pending)
    // Only create if contribution was created before approval (or if no approval exists)
    const approval = approvalMap.get(contribId)
    const shouldCreatePendingNotif = !approval || new Date(contribDate) < new Date(approval.created_at)
    
    if (shouldCreatePendingNotif && adminUserIds.length > 0) {
      for (const adminId of adminUserIds) {
        const notifKey = `${contribId}:contribution_pending:${adminId}`
        
        if (!existingNotifKeys.has(notifKey)) {
          notificationsToInsert.push({
            type: 'contribution_pending',
            recipient_id: adminId,
            title: 'New Contribution Submitted',
            message: `A new contribution of ${amount.toLocaleString()} EGP has been submitted for case: ${caseTitle}`,
            data: {
              contribution_id: contribId,
              case_id: contrib.case_id,
              amount: amount
            },
            read: false,
            created_at: contribDate // Use contribution creation date
          })
          pendingCount++
        } else {
          skippedCount++
        }
      }
    }
    
    // 2. Create donor notification for approved contributions
    if (approval && approval.status === 'approved' && donorId) {
      const notifKey = `${contribId}:contribution_approved:${donorId}`
      
      if (!existingNotifKeys.has(notifKey)) {
        notificationsToInsert.push({
          type: 'contribution_approved',
          recipient_id: donorId,
          title: 'Contribution Approved',
          message: `Your contribution of ${amount.toLocaleString()} EGP for "${caseTitle}" has been approved. Thank you for your generosity!`,
          data: {
            contribution_id: contribId,
            amount: amount,
            case_title: caseTitle
          },
          read: false,
          created_at: approval.created_at // Use approval date
        })
        approvedCount++
      } else {
        skippedCount++
      }
    }
    
    // 3. Create donor notification for rejected contributions
    if (approval && approval.status === 'rejected' && donorId) {
      const notifKey = `${contribId}:contribution_rejected:${donorId}`
      
      if (!existingNotifKeys.has(notifKey)) {
        notificationsToInsert.push({
          type: 'contribution_rejected',
          recipient_id: donorId,
          title: 'Contribution Rejected',
          message: `Your contribution of ${amount.toLocaleString()} EGP for "${caseTitle}" has been rejected.`,
          data: {
            contribution_id: contribId,
            amount: amount,
            case_title: caseTitle
          },
          read: false,
          created_at: approval.created_at // Use approval date
        })
      } else {
        skippedCount++
      }
    }
  }
  
  console.log(`   📊 Prepared ${notificationsToInsert.length} notifications to create:`)
  console.log(`      - ${pendingCount} pending notifications (for admins)`)
  console.log(`      - ${approvedCount} approval notifications (for donors)`)
  console.log(`      - ${skippedCount} skipped (already exist)\n`)
  
  if (notificationsToInsert.length === 0) {
    console.log('✅ All notifications already exist. Nothing to create.\n')
    return
  }
  
  // Step 6: Insert notifications in batches
  console.log('💾 Step 6: Inserting notifications...')
  const batchSize = 100
  let insertedCount = 0
  let errorCount = 0
  
  for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
    const batch = notificationsToInsert.slice(i, i + batchSize)
    
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(batch)
    
    if (insertError) {
      console.error(`   ⚠️  Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message)
      errorCount += batch.length
    } else {
      insertedCount += batch.length
      process.stdout.write(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${insertedCount}/${notificationsToInsert.length})\r`)
    }
  }
  
  console.log(`\n   ✅ Inserted ${insertedCount} notifications`)
  if (errorCount > 0) {
    console.log(`   ⚠️  Failed to insert ${errorCount} notifications`)
  }
  console.log()
  
  // Step 7: Verify notifications
  console.log('🔍 Step 7: Verifying notifications...')
  const { count: totalNotifCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .in('type', ['contribution_pending', 'contribution_approved', 'contribution_rejected'])
  
  const { count: pendingNotifCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'contribution_pending')
  
  const { count: approvedNotifCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'contribution_approved')
  
  console.log(`   ✓ Total contribution notifications: ${totalNotifCount || 0}`)
  console.log(`   ✓ Pending notifications: ${pendingNotifCount || 0}`)
  console.log(`   ✓ Approved notifications: ${approvedNotifCount || 0}\n`)
  
  // Summary
  console.log('='.repeat(60))
  console.log('📊 BACKFILL SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Processed ${contributions.length} contributions`)
  console.log(`✅ Created ${insertedCount} notifications`)
  console.log(`   - ${pendingCount} pending (admin notifications)`)
  console.log(`   - ${approvedCount} approved (donor notifications)`)
  console.log(`⚠️  Skipped ${skippedCount} (already exist)`)
  if (errorCount > 0) {
    console.log(`❌ Failed ${errorCount} notifications`)
  }
  console.log('='.repeat(60) + '\n')
}

backfillNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

