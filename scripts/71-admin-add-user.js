import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function addUser() {
  try {
    console.log('👤 Adding user to database...')

    // Add the specific user that's causing the foreign key error
    const userData = {
      id: 'f62f828c-c9c8-416c-bef2-1a64a693dceb',
      email: 'test@example.com', // You can change this
      role: 'donor',
      first_name: 'Test',
      last_name: 'User',
      phone: null,
      address: null,
      profile_image: null,
      is_active: true,
      email_verified: true,
      language: 'en',
      notifications: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert(userData)

    if (insertError) {
      console.error('❌ Error inserting user:', insertError)
      return
    }

    console.log('✅ Successfully added user to database')
    console.log(`  - ID: ${userData.id}`)
    console.log(`  - Email: ${userData.email}`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addUser() 