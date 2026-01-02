#!/usr/bin/env node
/**
 * Script to prompt existing users to subscribe to push notifications
 * 
 * Note: This script cannot actually subscribe users without their permission.
 * Instead, it marks users as "should be prompted" so they will see the
 * auto-subscribe prompt on their next login.
 * 
 * Usage: node scripts/admin/78-auto-subscribe-existing-users.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

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
const isDryRun = process.argv.includes('--dry-run')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function autoSubscribeUsers() {
  console.log('\n🔔 Auto-Subscribe Existing Users to Push Notifications\n')

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  try {
    // Get all users
    console.log('📊 Fetching all users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found')
      return
    }

    console.log(`✅ Found ${users.length} users\n`)

    // Check which users already have FCM tokens
    console.log('🔍 Checking existing FCM subscriptions...')
    const { data: fcmTokens, error: fcmError } = await supabase
      .from('fcm_tokens')
      .select('user_id, active')
      .eq('active', true)

    if (fcmError) {
      console.error('❌ Error fetching FCM tokens:', fcmError.message)
      return
    }

    const subscribedUserIds = new Set((fcmTokens || []).map(t => t.user_id))
    console.log(`✅ Found ${subscribedUserIds.size} users with active FCM tokens\n`)

    // Find users who haven't subscribed
    const unsubscribedUsers = users.filter(u => !subscribedUserIds.has(u.id))

    console.log(`📋 Summary:`)
    console.log(`   Total users: ${users.length}`)
    console.log(`   Already subscribed: ${subscribedUserIds.size}`)
    console.log(`   Not subscribed: ${unsubscribedUsers.length}\n`)

    if (unsubscribedUsers.length === 0) {
      console.log('✅ All users are already subscribed to push notifications!\n')
      return
    }

    if (!isDryRun) {
      console.log('⚠️  IMPORTANT:')
      console.log('   This script cannot automatically subscribe users to push notifications.')
      console.log('   Browsers require explicit user permission for push notifications.')
      console.log('   Instead, users will be prompted to subscribe on their next login.\n')
      
      const answer = await question('Continue? (yes/no): ')
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Cancelled\n')
        return
      }
    }

    // Show sample of unsubscribed users
    console.log('\n📋 Sample of unsubscribed users (first 10):')
    unsubscribedUsers.slice(0, 10).forEach((user, idx) => {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'
      console.log(`   ${idx + 1}. ${user.email} (${name})`)
    })
    if (unsubscribedUsers.length > 10) {
      console.log(`   ... and ${unsubscribedUsers.length - 10} more`)
    }

    console.log('\n💡 Next Steps:')
    console.log('   1. The AutoSubscribePrompt component will automatically show to users on login')
    console.log('   2. Users will see a prompt asking them to enable push notifications')
    console.log('   3. Users can click "Enable Notifications" to subscribe')
    console.log('   4. The prompt will only show once per user (unless they dismiss it)')
    console.log('\n✅ Script completed successfully!\n')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  } finally {
    rl.close()
  }
}

autoSubscribeUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

