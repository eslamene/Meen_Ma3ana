const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUpdates() {
  try {
    console.log('🔍 Checking for case updates...')
    
    // Get all cases
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title')
      .limit(5)
    
    if (casesError) {
      console.error('Error fetching cases:', casesError)
      return
    }
    
    console.log(`📋 Found ${cases.length} cases:`)
    cases.forEach((case_, index) => {
      console.log(`${index + 1}. ${case_.title} (${case_.id})`)
    })
    
    if (cases.length === 0) {
      console.log('❌ No cases found.')
      return
    }
    
    // Check updates for each case
    for (const case_ of cases) {
      console.log(`\n🔍 Checking updates for case: ${case_.title}`)
      
      const { data: updates, error: updatesError } = await supabase
        .from('case_updates')
        .select('*')
        .eq('case_id', case_.id)
        .order('created_at', { ascending: false })
      
      if (updatesError) {
        console.error(`Error fetching updates for case ${case_.id}:`, updatesError)
        continue
      }
      
      console.log(`📝 Found ${updates.length} updates:`)
      
      if (updates.length === 0) {
        console.log('   ❌ No updates found')
      } else {
        updates.forEach((update, index) => {
          console.log(`   ${index + 1}. ${update.title} (${update.update_type}) - ${new Date(update.created_at).toLocaleString()}`)
        })
      }
    }
    
    // Also check all updates in the system
    console.log('\n🔍 Checking all updates in the system...')
    const { data: allUpdates, error: allUpdatesError } = await supabase
      .from('case_updates')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allUpdatesError) {
      console.error('Error fetching all updates:', allUpdatesError)
      return
    }
    
    console.log(`📝 Total updates in system: ${allUpdates.length}`)
    
    if (allUpdates.length > 0) {
      console.log('Recent updates:')
      allUpdates.slice(0, 5).forEach((update, index) => {
        console.log(`   ${index + 1}. ${update.title} (${update.update_type}) - Case: ${update.case_id}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
checkUpdates() 