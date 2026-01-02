#!/usr/bin/env node
/**
 * Script to check RLS policies for notifications table
 * Usage: node scripts/admin/77-check-notifications-rls.js
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

async function checkRLS() {
  console.log('\n🔍 Checking RLS policies for notifications table...\n')

  try {
    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'notifications';
      `
    })

    if (rlsError) {
      // Try alternative method
      const { data: altCheck } = await supabase
        .from('notifications')
        .select('*')
        .limit(0)
      
      console.log('ℹ️  Using service role key (bypasses RLS) to check table...\n')
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          policyname,
          cmd as command,
          permissive,
          roles,
          qual as using_expression,
          with_check as with_check_expression
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'notifications'
        ORDER BY policyname;
      `
    })

    if (policiesError) {
      console.log('⚠️  Could not query policies directly. Please run this SQL in Supabase SQL Editor:\n')
      console.log(`
-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'notifications';

-- List all RLS policies
SELECT 
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'notifications'
ORDER BY policyname;
      `)
    } else if (policies && policies.length > 0) {
      console.log('✅ Found RLS policies:\n')
      policies.forEach((policy, idx) => {
        console.log(`${idx + 1}. ${policy.policyname}`)
        console.log(`   Command: ${policy.command}`)
        console.log(`   Permissive: ${policy.permissive}`)
        if (policy.using_expression) {
          console.log(`   Using: ${policy.using_expression.substring(0, 100)}...`)
        }
        if (policy.with_check_expression) {
          console.log(`   With Check: ${policy.with_check_expression.substring(0, 100)}...`)
        }
        console.log('')
      })
    } else {
      console.log('❌ No RLS policies found for notifications table!')
      console.log('\n💡 This means:')
      console.log('   - If RLS is enabled, NO ONE can access notifications')
      console.log('   - You need to run the migration: drizzle/migrations/0013_enable_rls_notifications.sql')
      console.log('\n📝 To fix, run this SQL in Supabase SQL Editor:\n')
      console.log(`
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
USING (auth.uid() IS NOT NULL AND recipient_id = auth.uid());

-- Allow users to update their own notifications
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() IS NOT NULL AND recipient_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND recipient_id = auth.uid());
      `)
    }

    // Test query as a regular user (if we can simulate)
    console.log('\n🧪 Testing notification access...\n')
    
    // Get a sample user
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
      .single()

    if (users) {
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', users.id)

      if (countError) {
        console.log('❌ Error querying notifications:', countError.message)
        console.log('   This suggests RLS is blocking the query!')
      } else {
        console.log(`✅ Service role can query notifications (found ${count || 0} for sample user)`)
        console.log('   Note: Service role bypasses RLS, so this doesn\'t test user-level access')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkRLS()
  .then(() => {
    console.log('\n✅ Done!\n')
    console.log('💡 Next steps:')
    console.log('   1. Run the migration: drizzle/migrations/0013_enable_rls_notifications.sql')
    console.log('   2. Or apply it via: supabase db push')
    console.log('   3. Then test notifications from a donor account\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

