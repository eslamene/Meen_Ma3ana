import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function applyMigration() {
  try {
    console.log('🔄 Applying migration...')
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('drizzle/migrations/0002_naive_hedge_knight.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL.split('--> statement-breakpoint').map(stmt => stmt.trim()).filter(stmt => stmt)
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...')
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error('Error executing statement:', error)
        console.error('Statement was:', statement)
        return
      }
    }
    
    console.log('✅ Migration applied successfully!')
  } catch (error) {
    console.error('❌ Error applying migration:', error)
  }
}

applyMigration() 