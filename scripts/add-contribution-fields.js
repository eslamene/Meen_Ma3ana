const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addContributionFields() {
  try {
    console.log('🔧 Adding transaction_number and attachments fields to contributions table...')

    // Check if columns already exist
    const { data: existingColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'contributions')
      .in('column_name', ['transaction_number', 'attachments'])

    if (checkError) {
      console.error('❌ Error checking existing columns:', checkError)
      return
    }

    const existingColumnNames = existingColumns?.map(col => col.column_name) || []
    console.log('📋 Existing columns:', existingColumnNames)

    // Add transaction_number if it doesn't exist
    if (!existingColumnNames.includes('transaction_number')) {
      console.log('➕ Adding transaction_number column...')
      // We'll need to use a different approach since RPC might not be available
      console.log('⚠️  Please manually add the transaction_number column using:')
      console.log('   ALTER TABLE contributions ADD COLUMN transaction_number text;')
    } else {
      console.log('✅ transaction_number column already exists')
    }

    // Add attachments if it doesn't exist
    if (!existingColumnNames.includes('attachments')) {
      console.log('➕ Adding attachments column...')
      console.log('⚠️  Please manually add the attachments column using:')
      console.log('   ALTER TABLE contributions ADD COLUMN attachments text;')
    } else {
      console.log('✅ attachments column already exists')
    }

    console.log('✅ Check complete! Please run the SQL commands manually if needed.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addContributionFields() 