const { createClient } = require('@supabase/supabase-js')

// Script to refresh user role from database
async function refreshUserRole() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }

  console.log('🔧 Refreshing user role from database...')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated')
      console.log('Please make sure you are logged in to the application')
      return
    }

    console.log('👤 Current user:', user.email)
    console.log('🆔 User ID:', user.id)
    console.log('📋 Current session role:', user.user_metadata?.role || 'donor')

    // Fetch the latest role from the database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError.message)
      return
    }

    const databaseRole = userData?.role || 'donor'
    console.log('🗄️ Database role:', databaseRole)

    if (databaseRole === (user.user_metadata?.role || 'donor')) {
      console.log('✅ Roles match - no update needed')
      return
    }

    // Update the session metadata with the latest role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: databaseRole }
    })

    if (updateError) {
      console.error('❌ Failed to update session:', updateError.message)
      return
    }

    console.log('✅ Role updated successfully!')
    console.log('🔄 Session role updated from', user.user_metadata?.role || 'donor', 'to', databaseRole)
    console.log('\n💡 Next steps:')
    console.log('1. Refresh your browser page')
    console.log('2. The dashboard should now show the correct role')
    console.log('3. You should have access to admin features if role is "admin"')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Load environment variables
require('dotenv').config()

refreshUserRole() 