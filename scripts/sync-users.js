import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function syncUsers() {
  try {
    console.log('🔄 Syncing Supabase Auth users to database...')

    // Get all users from Supabase Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      return
    }

    console.log(`📊 Found ${users.length} users in Supabase Auth`)

    // Check which users already exist in the database
    const { data: existingUsers, error: dbError } = await supabase
      .from('users')
      .select('id, email')

    if (dbError) {
      console.error('❌ Error fetching database users:', dbError)
      return
    }

    const existingUserIds = new Set(existingUsers?.map(u => u.id) || [])
    const usersToCreate = users.filter(user => !existingUserIds.has(user.id))

    console.log(`📝 Found ${usersToCreate.length} users to sync`)

    if (usersToCreate.length === 0) {
      console.log('✅ All users are already synced!')
      return
    }

    // Create users in the database
    const usersData = usersToCreate.map(user => ({
      id: user.id,
      email: user.email,
      role: 'donor', // Default role
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
      phone: user.user_metadata?.phone || null,
      address: user.user_metadata?.address || null,
      profile_image: user.user_metadata?.avatar_url || null,
      is_active: true,
      email_verified: user.email_confirmed_at ? true : false,
      language: user.user_metadata?.language || 'en',
      notifications: user.user_metadata?.notifications || null,
      created_at: user.created_at,
      updated_at: user.updated_at
    }))

    const { error: insertError } = await supabase
      .from('users')
      .insert(usersData)

    if (insertError) {
      console.error('❌ Error inserting users:', insertError)
      return
    }

    console.log(`✅ Successfully synced ${usersToCreate.length} users to database`)
    
    // Log the synced users
    usersToCreate.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

syncUsers() 