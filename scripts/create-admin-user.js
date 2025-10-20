const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...')
    
    const adminUser = {
      email: 'admin@meenma3ana.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      phone: '+201234567890',
      address: 'Cairo, Egypt',
      is_active: true,
      email_verified: true,
      language: 'en',
      notifications: JSON.stringify({
        email: true,
        push: true,
        sms: false
      })
    }
    
    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', adminUser.email)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return
    }
    
    if (existingUser) {
      console.log(`✅ Admin user already exists: ${existingUser.email} (${existingUser.id})`)
      return existingUser.id
    }
    
    // Create new admin user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(adminUser)
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating admin user:', createError)
      return
    }
    
    console.log(`✅ Admin user created successfully: ${newUser.email} (${newUser.id})`)
    return newUser.id
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
createAdminUser() 