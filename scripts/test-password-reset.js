const { createClient } = require('@supabase/supabase-js')

// Test script to verify Supabase password reset configuration
async function testPasswordReset() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please check your .env file contains:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return
  }

  console.log('🔧 Testing Supabase configuration...')
  console.log('URL:', supabaseUrl)
  console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Test auth configuration first
    console.log('\n🔐 Testing Auth configuration...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ Auth configuration error:', authError.message)
      return
    }

    console.log('✅ Auth configuration successful')

    // Test basic connection with a simple query
    console.log('\n🗄️ Testing Database connection...')
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.log('⚠️ Database connection test failed (this might be normal):', error.message)
      console.log('This could be because the users table doesn\'t exist yet or RLS is enabled')
    } else {
      console.log('✅ Database connection successful')
    }

    // Test password reset email (commented out to avoid sending actual emails)
    console.log('\n📧 Password Reset Flow Test:')
    console.log('1. Go to your app and request a password reset')
    console.log('2. Check the email for the reset link')
    console.log('3. Click the link and verify it redirects properly')
    console.log('4. Check the browser console for any errors')

    console.log('\n🔍 Supabase Dashboard Configuration Checklist:')
    console.log('✅ Authentication > Settings:')
    console.log('  - Site URL should be: http://localhost:3000 (dev) or your production URL')
    console.log('  - Redirect URLs should include:')
    console.log('    * http://localhost:3000/auth/callback')
    console.log('    * http://localhost:3000/en/auth/callback')
    console.log('    * http://localhost:3000/ar/auth/callback')
    console.log('    * Your production URLs with the same pattern')
    console.log('✅ Authentication > Email Templates:')
    console.log('  - Confirm signup template should be configured')
    console.log('  - Reset password template should be configured')
    console.log('✅ Authentication > Providers:')
    console.log('  - Email provider should be enabled')

    console.log('\n🐛 Debugging Steps:')
    console.log('1. Open browser developer tools')
    console.log('2. Go to Network tab')
    console.log('3. Request a password reset')
    console.log('4. Check for any failed API calls')
    console.log('5. Check Console tab for JavaScript errors')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Load environment variables
require('dotenv').config()

testPasswordReset() 