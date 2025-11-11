/**
 * Alternative: Import script that creates users via SQL instead of Auth API
 * 
 * This bypasses the trigger issue by creating users directly in auth.users table
 * via SQL, then creating the app user record.
 * 
 * WARNING: This requires direct database access and bypasses Supabase Auth API
 * Use only if the Auth API method fails consistently.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Hash password for Supabase auth
function hashPassword(password) {
  // Supabase uses bcrypt, but we'll use a simpler approach via SQL
  // Actually, we should use Supabase's password hashing
  return password
}

// Generate email
function generateEmail(contributorId) {
  const cleanId = contributorId.toString().padStart(4, '0')
  return `contributor${cleanId}@contributor.meenma3ana.local`
}

// Create user via SQL (bypasses Auth API)
async function createUserViaSQL(contributorId, contributorName) {
  const email = generateEmail(contributorId, contributorName)
  const password = crypto.randomBytes(16).toString('hex')
  const userId = crypto.randomUUID()
  
  // This is complex - Supabase auth uses encrypted passwords
  // Better to use the workaround script instead
  console.log('⚠️  Direct SQL user creation is complex due to password encryption')
  console.log('   Use import-with-trigger-disabled.js instead')
  return null
}

// Main function - redirects to workaround
async function main() {
  console.log('⚠️  Direct SQL user creation requires password encryption')
  console.log('   Use the workaround script instead:\n')
  console.log('   node scripts/import-with-trigger-disabled.js\n')
  process.exit(1)
}

main()

