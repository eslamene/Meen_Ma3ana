import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyVisitorRoleMigration() {
  console.log('🔄 Applying visitor role migration...')
  
  try {
    const migrationSQL = fs.readFileSync('drizzle/migrations/0007_add_visitor_role.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec', { sql: statement })
        if (error) {
          console.error('❌ Statement failed:', statement.substring(0, 100) + '...')
          console.error('Error:', error.message)
          return
        }
      }
    }
    
    console.log('✅ Visitor role migration applied successfully!')
    
    // Verify the visitor role was created
    const { data: visitorRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'visitor')
      .single()
      
    if (roleError) {
      console.log('⚠️ Could not verify visitor role:', roleError.message)
    } else {
      console.log('✅ Visitor role created:', visitorRole.display_name)
    }
    
    // Check visitor permissions
    const { data: visitorPermissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions(name, display_name)
      `)
      .eq('role_id', visitorRole?.id)
      
    if (!permError && visitorPermissions) {
      console.log(`✅ Visitor has ${visitorPermissions.length} permissions:`)
      visitorPermissions.forEach(rp => {
        console.log(`   🔑 ${rp.permissions.display_name} (${rp.permissions.name})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
  }
}

applyVisitorRoleMigration()
