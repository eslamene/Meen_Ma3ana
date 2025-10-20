const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addAnonymousColumn() {
  console.log('🔧 Adding anonymous column to contributions table...\n')
  
  try {
    // Try to add the column directly
    const { error } = await supabase
      .from('contributions')
      .select('id, anonymous')
      .limit(1)

    if (error && error.message.includes('column "anonymous" does not exist')) {
      console.log('✅ Column does not exist, attempting to add it...')
      
      // Since we can't use exec_sql, let's try to create a new table with the column
      // and then copy data (this is a workaround)
      console.log('⚠️  Please add the anonymous column manually via Supabase dashboard:')
      console.log('   ALTER TABLE contributions ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT false;')
      return false
    } else if (error) {
      console.error('❌ Error:', error.message)
      return false
    } else {
      console.log('✅ Anonymous column already exists')
      return true
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

addAnonymousColumn()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Column already exists!')
    } else {
      console.log('\n⚠️  Please add the column manually via Supabase dashboard')
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 