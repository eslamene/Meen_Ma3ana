#!/usr/bin/env node

/**
 * Database Schema Audit Script
 * 
 * This script audits the database to identify:
 * 1. Tables that exist in the database but not in Drizzle schema
 * 2. Tables that exist in Drizzle schema but not in the database
 * 3. Migration files that can be archived
 * 
 * Usage:
 *   node scripts/cleanup/audit-database-schema.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Tables defined in Drizzle schema
const drizzleTables = [
  'users',
  'payment_methods',
  'case_categories',
  'category_detection_rules',
  'cases',
  'case_images',
  'case_files',
  'case_status_history',
  'case_updates',
  'projects',
  'project_cycles',
  'contributions',
  'recurring_contributions',
  'sponsorships',
  'communications',
  'localization',
  'notifications',
  'landing_stats',
  'system_config',
  'system_content',
  'contribution_approval_status',
  'beneficiaries',
  'beneficiary_documents',
  'id_types',
  'cities',
  'site_activity_log',
  'storage_rules',
  'admin_roles',
  'admin_permissions',
  'admin_role_permissions',
  'admin_user_roles',
  'admin_menu_items',
]

async function getDatabaseTables() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  })

  if (error) {
    // Fallback: query directly
    const { data: tables, error: queryError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name')

    if (queryError) {
      console.error('❌ Error fetching tables:', queryError)
      return []
    }

    return tables.map(t => t.table_name)
  }

  return data || []
}

async function main() {
  console.log('🔍 Auditing database schema...\n')

  try {
    // Get tables from database
    const dbTables = await getDatabaseTables()
    
    console.log(`📊 Found ${dbTables.length} tables in database`)
    console.log(`📋 Found ${drizzleTables.length} tables in Drizzle schema\n`)

    // Find tables in DB but not in schema
    const missingInSchema = dbTables.filter(
      table => !drizzleTables.includes(table)
    )

    // Find tables in schema but not in DB
    const missingInDB = drizzleTables.filter(
      table => !dbTables.includes(table)
    )

    // Find tables in both
    const inBoth = drizzleTables.filter(table => dbTables.includes(table))

    console.log('✅ Tables in both database and schema:')
    console.log(`   ${inBoth.length} tables\n`)
    if (inBoth.length > 0) {
      inBoth.forEach(table => console.log(`   ✓ ${table}`))
      console.log()
    }

    if (missingInSchema.length > 0) {
      console.log('⚠️  Tables in database but NOT in Drizzle schema:')
      missingInSchema.forEach(table => console.log(`   - ${table}`))
      console.log('\n   💡 These tables should be added to drizzle/schema.ts\n')
    }

    if (missingInDB.length > 0) {
      console.log('⚠️  Tables in Drizzle schema but NOT in database:')
      missingInDB.forEach(table => console.log(`   - ${table}`))
      console.log('\n   💡 These tables need to be created via migration\n')
    }

    if (missingInSchema.length === 0 && missingInDB.length === 0) {
      console.log('✅ Schema is in sync! All tables match.\n')
    }

    // Migration file analysis
    console.log('\n📁 Migration Files Analysis:')
    console.log('   Review supabase/migrations/ for files that can be archived')
    console.log('   Consider consolidating incremental changes into base migrations\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()

