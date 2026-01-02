#!/usr/bin/env node
/**
 * Script to check notifications for a user
 * Usage: node scripts/admin/76-check-notifications.js [user-email]
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkNotifications(userEmail) {
  console.log('\n🔍 Checking notifications...\n')

  try {
    // First, get the user
    let userId
    if (userEmail) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('email', userEmail)
        .single()

      if (userError || !user) {
        console.error('❌ User not found:', userEmail)
        console.error('   Error:', userError?.message)
        return
      }

      userId = user.id
      console.log('✅ Found user:')
      console.log('   ID:', userId)
      console.log('   Email:', user.email)
      console.log('   Name:', `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A')
    } else {
      // Get all users and their notification counts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .limit(10)

      if (usersError) {
        console.error('❌ Error fetching users:', usersError.message)
        return
      }

      console.log('📊 Checking notifications for all users (first 10):\n')

      for (const user of users || []) {
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)

        if (countError) {
          console.log(`❌ ${user.email}: Error - ${countError.message}`)
        } else {
          console.log(`✅ ${user.email}: ${count || 0} notifications`)
        }
      }

      return
    }

    // Check total notifications for this user
    const { count: totalCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)

    if (countError) {
      console.error('❌ Error counting notifications:', countError.message)
      console.error('   Code:', countError.code)
      console.error('   Details:', countError.details)
      console.error('   Hint:', countError.hint)
      return
    }

    console.log(`\n📬 Total notifications: ${totalCount || 0}\n`)

    if (totalCount === 0) {
      console.log('⚠️  No notifications found for this user.')
      console.log('\n💡 Possible reasons:')
      console.log('   1. No contributions have been approved/rejected yet')
      console.log('   2. Notifications are being sent to a different user (donor_id)')
      console.log('   3. Notification creation is failing silently')
      console.log('\n🔍 Checking recent contributions...\n')

      // Check recent contributions
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('id, donor_id, status, amount, created_at, cases(title_en, title_ar)')
        .eq('donor_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (contribError) {
        console.error('❌ Error fetching contributions:', contribError.message)
      } else if (contributions && contributions.length > 0) {
        console.log(`✅ Found ${contributions.length} recent contribution(s):`)
        contributions.forEach((contrib, idx) => {
          const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
          const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
          console.log(`   ${idx + 1}. ${contrib.status} - $${contrib.amount} - ${caseTitle}`)
          console.log(`      Created: ${new Date(contrib.created_at).toLocaleString()}`)
        })
      } else {
        console.log('ℹ️  No contributions found for this user.')
      }

      return
    }

    // Get recent notifications
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError.message)
      return
    }

    console.log(`\n📋 Recent notifications (showing ${notifications?.length || 0} of ${totalCount}):\n`)

    notifications?.forEach((notif, idx) => {
      console.log(`${idx + 1}. [${notif.type}] ${notif.read ? '✓ Read' : '○ Unread'}`)
      console.log(`   Title: ${notif.title_en || notif.title || 'N/A'}`)
      console.log(`   Message: ${(notif.message_en || notif.message || 'N/A').substring(0, 60)}...`)
      console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`)
      if (notif.data) {
        const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data
        if (data.contribution_id) {
          console.log(`   Contribution ID: ${data.contribution_id}`)
        }
      }
      console.log('')
    })

    // Check unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false)

    console.log(`\n📊 Summary:`)
    console.log(`   Total: ${totalCount}`)
    console.log(`   Unread: ${unreadCount || 0}`)
    console.log(`   Read: ${(totalCount || 0) - (unreadCount || 0)}`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get user email from command line
const userEmail = process.argv[2]

checkNotifications(userEmail)
  .then(() => {
    console.log('\n✅ Done!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

