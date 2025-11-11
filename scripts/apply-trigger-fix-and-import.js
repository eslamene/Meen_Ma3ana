/**
 * Apply Trigger Fix and Run Import
 * 
 * This script applies the trigger fix SQL and then runs the import script.
 * The trigger fix makes the trigger handle errors gracefully so user creation succeeds.
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is required')
  console.error('   Add DATABASE_URL to .env.local')
  console.error('   Format: postgresql://user:password@host:port/database')
  console.error('   Get it from: Supabase Dashboard > Settings > Database > Connection string')
  process.exit(1)
}

// Execute SQL command using psql
function executeSQL(sql) {
  try {
    // Parse DATABASE_URL to handle special characters in password
    const url = new URL(databaseUrl)
    
    // Use environment variables to avoid shell escaping issues
    process.env.PGSSLMODE = 'require'
    process.env.PGDATABASE = url.pathname.slice(1) // Remove leading /
    process.env.PGHOST = url.hostname
    process.env.PGPORT = url.port || '5432'
    process.env.PGUSER = url.username
    process.env.PGPASSWORD = url.password
    
    // Write SQL to temp file to avoid shell escaping issues
    const tempFile = join(__dirname, '..', '.temp_trigger_fix.sql')
    fs.writeFileSync(tempFile, sql, 'utf-8')
    
    // Execute SQL file
    const command = `psql -f "${tempFile}"`
    
    execSync(command, { 
      stdio: 'inherit',
      env: process.env
    })
    
    // Clean up temp file
    fs.unlinkSync(tempFile)
    
    return true
  } catch (error) {
    console.error('❌ SQL execution error:', error.message)
    return false
  }
}

async function applyTriggerFixAndImport() {
  console.log('🔧 Apply Trigger Fix and Run Import\n')
  console.log('='.repeat(60))
  
  // Read trigger fix SQL
  const triggerFixPath = join(__dirname, '..', 'supabase', 'migrations', '032_fix_donor_role_trigger.sql')
  
  if (!fs.existsSync(triggerFixPath)) {
    console.error(`❌ Trigger fix SQL file not found: ${triggerFixPath}`)
    process.exit(1)
  }
  
  const triggerFixSQL = fs.readFileSync(triggerFixPath, 'utf-8')
  
  console.log('📝 Step 1: Applying trigger fix...\n')
  console.log('   This updates the trigger function to handle errors gracefully.\n')
  
  const success = executeSQL(triggerFixSQL)
  
  if (!success) {
    console.error('\n❌ Failed to apply trigger fix')
    console.error('\n📋 Manual Alternative:')
    console.error('   1. Go to Supabase Dashboard > SQL Editor')
    console.error('   2. Copy and paste the SQL from:')
    console.error(`      ${triggerFixPath}`)
    console.error('   3. Run the SQL')
    console.error('   4. Then run: node scripts/import-contributions-with-users.js\n')
    process.exit(1)
  }
  
  console.log('\n✅ Trigger fix applied successfully!\n')
  console.log('='.repeat(60))
  console.log('📦 Step 2: Running import script...\n')
  console.log('='.repeat(60) + '\n')
  
  // Run the import script
  try {
    execSync('node scripts/import-contributions-with-users.js', {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    })
  } catch (error) {
    console.error('\n❌ Import script failed')
    process.exit(1)
  }
}

// Run the script
applyTriggerFixAndImport().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

