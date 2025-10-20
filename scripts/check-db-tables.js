#!/usr/bin/env node

/**
 * check-db-tables.js
 * Script to check what tables exist in the database
 */

import postgres from 'postgres'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const connectionString = 'postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function checkTables() {
  const client = postgres(connectionString, {
    ssl: 'require'
  })

  try {
    console.log('Checking existing tables...')
    
    // Get all tables in the public schema
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    
    console.log('\n✅ Existing tables:')
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`)
    })

    // Check if contributions table exists
    const contributionsExists = tables.find(t => t.table_name === 'contributions')
    if (contributionsExists) {
      console.log('\n✅ Contributions table exists')
    } else {
      console.log('\n❌ Contributions table does not exist')
    }

    // Check foreign key constraints for contributions
    if (contributionsExists) {
      const constraints = await client`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'contributions'
      `
      
      console.log('\n📋 Foreign key constraints for contributions:')
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error)
  } finally {
    await client.end()
  }
}

// Run the script
checkTables() 