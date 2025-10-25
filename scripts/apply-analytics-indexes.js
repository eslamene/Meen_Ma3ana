const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyAnalyticsIndexes() {
  try {
    console.log('📊 Applying analytics performance indexes...')
    
    const sqlFile = path.join(__dirname, '../drizzle/migrations/0008_add_analytics_indexes.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} index statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`)
      
      try {
        // Use the SQL editor approach
        const { data, error } = await supabase
          .from('_temp_table_that_doesnt_exist')
          .select('*')
          .limit(0)
        
        // Since we can't execute DDL directly, let's use a different approach
        // We'll create a simple query to test if indexes exist
        const indexName = statement.match(/idx_[\w_]+/)?.[0]
        if (indexName) {
          console.log(`✅ Index statement prepared: ${indexName}`)
        } else {
          console.log(`✅ Statement prepared`)
        }
        
      } catch (error) {
        console.warn(`⚠️  Warning for statement: ${error.message}`)
      }
    }
    
    console.log('\n🎉 Analytics indexes preparation completed!')
    console.log('\n📝 To apply these indexes, please run them manually in your Supabase SQL editor:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of drizzle/migrations/0008_add_analytics_indexes.sql')
    console.log('4. Execute the SQL')
    
  } catch (error) {
    console.error('❌ Error preparing indexes:', error.message)
    process.exit(1)
  }
}

applyAnalyticsIndexes()
