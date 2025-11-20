#!/usr/bin/env node

/**
 * Update User Email Domains
 * 
 * This script updates all user emails from:
 *   @contributor.meenma3ana.local
 * to:
 *   @ma3ana.org
 * 
 * It updates emails in both:
 * 1. Supabase Auth (auth.users table)
 * 2. Application users table (public.users table)
 * 
 * Usage: node scripts/80-update-user-email-domains.js
 * 
 * Requirements:
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const envLocalPath = join(__dirname, '..', '.env.local')
const envPath = join(__dirname, '..', '.env')

try {
  if (readFileSync(envLocalPath, 'utf8')) {
    dotenv.config({ path: envLocalPath })
  }
} catch (e) {
  // .env.local doesn't exist, that's okay
}

try {
  if (readFileSync(envPath, 'utf8')) {
    dotenv.config({ path: envPath })
  }
} catch (e) {
  // .env doesn't exist, that's okay
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Please check your .env.local or .env file')
  process.exit(1)
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

const OLD_DOMAIN = '@contributor.meenma3ana.local'
const NEW_DOMAIN = '@ma3ana.org'

/**
 * Fetch all users from the users table with the old email domain
 */
async function getUsersWithOldDomain() {
  console.log(`\n📋 Fetching users with email domain: ${OLD_DOMAIN}`)
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .like('email', `%${OLD_DOMAIN}`)
  
  if (error) {
    console.error('❌ Error fetching users:', error.message)
    throw error
  }
  
  console.log(`   Found ${data?.length || 0} users to update`)
  return data || []
}

/**
 * Update email in Supabase Auth
 */
async function updateAuthEmail(userId, oldEmail, newEmail) {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )
    
    if (error) {
      console.error(`   ❌ Failed to update auth email for ${oldEmail}:`, error.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error(`   ❌ Exception updating auth email for ${oldEmail}:`, err.message)
    return false
  }
}

/**
 * Update email in users table
 */
async function updateUserTableEmail(userId, newEmail) {
  const { error } = await supabase
    .from('users')
    .update({ email: newEmail })
    .eq('id', userId)
  
  if (error) {
    console.error(`   ❌ Failed to update users table for ${userId}:`, error.message)
    return false
  }
  
  return true
}

/**
 * Main function to update all user emails
 */
async function updateUserEmails() {
  console.log('🚀 Starting email domain update process...')
  console.log(`   From: ${OLD_DOMAIN}`)
  console.log(`   To: ${NEW_DOMAIN}`)
  
  // Get all users with old domain
  const users = await getUsersWithOldDomain()
  
  if (users.length === 0) {
    console.log('\n✅ No users found with the old email domain. Nothing to update.')
    return
  }
  
  console.log(`\n📝 Updating ${users.length} users...`)
  
  let successCount = 0
  let failCount = 0
  const failedUsers = []
  
  // Process users one by one to avoid rate limits
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const oldEmail = user.email
    const newEmail = oldEmail.replace(OLD_DOMAIN, NEW_DOMAIN)
    
    console.log(`\n[${i + 1}/${users.length}] Updating ${oldEmail} → ${newEmail}`)
    
    try {
      // Update in Supabase Auth first
      const authSuccess = await updateAuthEmail(user.id, oldEmail, newEmail)
      
      if (!authSuccess) {
        failCount++
        failedUsers.push({ id: user.id, email: oldEmail, reason: 'Auth update failed' })
        continue
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Update in users table
      const tableSuccess = await updateUserTableEmail(user.id, newEmail)
      
      if (!tableSuccess) {
        failCount++
        failedUsers.push({ id: user.id, email: oldEmail, reason: 'Users table update failed' })
        // Try to revert auth email change
        await updateAuthEmail(user.id, newEmail, oldEmail)
        continue
      }
      
      successCount++
      console.log(`   ✅ Successfully updated ${oldEmail}`)
      
      // Small delay between users to avoid rate limits
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error updating ${oldEmail}:`, err.message)
      failCount++
      failedUsers.push({ id: user.id, email: oldEmail, reason: err.message })
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Update Summary:')
  console.log(`   ✅ Successfully updated: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  
  if (failedUsers.length > 0) {
    console.log('\n⚠️  Failed users:')
    failedUsers.forEach(({ email, reason }) => {
      console.log(`   - ${email}: ${reason}`)
    })
  }
  
  console.log('\n✅ Email domain update process completed!')
}

// Run the script
updateUserEmails()
  .then(() => {
    console.log('\n✨ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })


