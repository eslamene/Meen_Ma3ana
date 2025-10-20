const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addUpdatesToCurrentCase() {
  try {
    console.log('🔍 Adding updates to the current case...')
    
    // Get the case ID from the command line argument or use the first case
    const caseId = process.argv[2] || '4a0f8617-3ce0-4fc1-a7ab-f0dca7e7c650' // Default to the case from the URL
    
    console.log(`📋 Using case ID: ${caseId}`)
    
    // Verify the case exists
    const { data: case_, error: caseError } = await supabase
      .from('cases')
      .select('id, title')
      .eq('id', caseId)
      .single()
    
    if (caseError) {
      console.error('Error fetching case:', caseError)
      return
    }
    
    if (!case_) {
      console.log('❌ Case not found. Please provide a valid case ID.')
      return
    }
    
    console.log(`✅ Found case: ${case_.title}`)
    
    // Get admin user for creating updates
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'admin')
      .limit(1)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No admin users found.')
      return
    }
    
    const adminUserId = users[0].id
    const adminName = `${users[0].first_name || 'Admin'} ${users[0].last_name || 'User'}`
    console.log(`👤 Using admin user: ${adminName}`)
    
    // Check if updates already exist for this case
    const { data: existingUpdates, error: existingError } = await supabase
      .from('case_updates')
      .select('id, title')
      .eq('case_id', caseId)
    
    if (existingError) {
      console.error('Error checking existing updates:', existingError)
      return
    }
    
    if (existingUpdates && existingUpdates.length > 0) {
      console.log(`📝 Found ${existingUpdates.length} existing updates for this case:`)
      existingUpdates.forEach((update, index) => {
        console.log(`   ${index + 1}. ${update.title}`)
      })
      console.log('✅ Updates already exist for this case!')
      return
    }
    
    // Sample updates data for the current case
    const sampleUpdates = [
      {
        case_id: caseId,
        title: 'Case Successfully Published! 🎉',
        content: `We're excited to announce that this case has been officially published and is now accepting donations. The family is grateful for any support you can provide during this difficult time.`,
        update_type: 'milestone',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: 'First Donation Received! 💝',
        content: `We've received our first donation of EGP 200! This is a wonderful start and shows that people care about helping others in need. Thank you to our generous donor!`,
        update_type: 'progress',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: '50% Goal Reached! 🎯',
        content: `Amazing news! We've reached 50% of our fundraising goal. The community's support has been incredible, and we're halfway to helping this family get back on their feet.`,
        update_type: 'milestone',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: 'Family Update: Medical Treatment Started',
        content: `The family has started receiving medical treatment thanks to your generous donations. The doctors are optimistic about the recovery process. Your support is making a real difference!`,
        update_type: 'progress',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: 'Thank You Message from the Family',
        content: `"We are overwhelmed by the kindness and generosity of everyone who has supported us. Your donations have given us hope and the ability to access the medical care we desperately need. Thank you from the bottom of our hearts." - The Family`,
        update_type: 'general',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: '75% Goal Achievement! 🚀',
        content: `We're thrilled to announce that we've reached 75% of our fundraising goal! With just 25% remaining, we're so close to fully supporting this family. Every donation counts!`,
        update_type: 'milestone',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        case_id: caseId,
        title: 'Latest Donation: EGP 150 Received',
        content: `Another generous donation of EGP 150 has been received! The donor wished to remain anonymous but wanted to express their support for the family. Thank you for your kindness!`,
        update_type: 'progress',
        is_public: true,
        created_by: adminUserId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    console.log('📝 Adding sample updates...')
    
    // Insert all sample updates
    const { data: insertedUpdates, error: insertError } = await supabase
      .from('case_updates')
      .insert(sampleUpdates)
      .select()
    
    if (insertError) {
      console.error('Error inserting updates:', insertError)
      return
    }
    
    console.log(`✅ Successfully added ${insertedUpdates.length} sample updates!`)
    console.log('\n📋 Sample updates added:')
    
    insertedUpdates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.title} (${update.update_type})`)
    })
    
    console.log('\n🎉 The Updates tab should now show these sample updates!')
    console.log('💡 Refresh the page to see the updates.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
addUpdatesToCurrentCase() 