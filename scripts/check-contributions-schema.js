const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkContributionsSchema() {
  try {
    console.log('🔍 Checking contributions table structure...')

    // Try to fetch a single contribution to see what fields are available
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error fetching contributions:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('📋 Available fields in contributions table:')
      const fields = Object.keys(data[0])
      fields.forEach(field => {
        console.log(`  - ${field}`)
      })

      // Check for our new fields
      const hasTransactionNumber = fields.includes('transaction_number')
      const hasAttachments = fields.includes('attachments')

      console.log('\n🔍 Field Status:')
      console.log(`  - transaction_number: ${hasTransactionNumber ? '✅ Exists' : '❌ Missing'}`)
      console.log(`  - attachments: ${hasAttachments ? '✅ Exists' : '❌ Missing'}`)

      if (!hasTransactionNumber || !hasAttachments) {
        console.log('\n📝 To add missing fields, run these SQL commands in your Supabase SQL editor:')
        if (!hasTransactionNumber) {
          console.log('   ALTER TABLE contributions ADD COLUMN transaction_number text;')
        }
        if (!hasAttachments) {
          console.log('   ALTER TABLE contributions ADD COLUMN attachments text;')
        }
      }
    } else {
      console.log('📭 No contributions found in the table')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkContributionsSchema() 