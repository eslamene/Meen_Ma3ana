#!/usr/bin/env node

/**
 * fix-foreign-keys.js
 * Script to add missing foreign key constraints to the contributions table
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Use the same connection string as in drizzle.config.ts
const connectionString = 'postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function fixForeignKeys() {
  const client = postgres(connectionString, {
    ssl: 'require'
  })

  try {
    console.log('Checking and fixing foreign key constraints...')
    
    // Check existing foreign key constraints
    const existingConstraints = await client`
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
    
    console.log('\n📋 Existing foreign key constraints:')
    existingConstraints.forEach(constraint => {
      console.log(`  - ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`)
    })

    // Define the constraints we need
    const requiredConstraints = [
      {
        name: 'contributions_donor_id_users_id_fk',
        column: 'donor_id',
        foreignTable: 'users',
        foreignColumn: 'id'
      },
      {
        name: 'contributions_case_id_cases_id_fk',
        column: 'case_id',
        foreignTable: 'cases',
        foreignColumn: 'id'
      },
      {
        name: 'contributions_project_id_projects_id_fk',
        column: 'project_id',
        foreignTable: 'projects',
        foreignColumn: 'id'
      },
      {
        name: 'contributions_project_cycle_id_project_cycles_id_fk',
        column: 'project_cycle_id',
        foreignTable: 'project_cycles',
        foreignColumn: 'id'
      }
    ]

    // Add missing constraints
    for (const constraint of requiredConstraints) {
      const exists = existingConstraints.find(c => 
        c.column_name === constraint.column && 
        c.foreign_table_name === constraint.foreignTable
      )

      if (!exists) {
        console.log(`\n➕ Adding constraint: ${constraint.name}`)
        try {
          await client`
            ALTER TABLE "contributions" 
            ADD CONSTRAINT "${constraint.name}" 
            FOREIGN KEY ("${constraint.column}") REFERENCES "public"."${constraint.foreignTable}"("${constraint.foreignColumn}") 
            ON DELETE no action ON UPDATE no action
          `
          console.log(`✅ Added constraint: ${constraint.name}`)
        } catch (error) {
          console.log(`❌ Failed to add constraint ${constraint.name}:`, error.message)
        }
      } else {
        console.log(`✅ Constraint already exists: ${constraint.name}`)
      }
    }

    console.log('\n🎉 Foreign key constraints check complete!')
    
  } catch (error) {
    console.error('❌ Error fixing foreign keys:', error)
  } finally {
    await client.end()
  }
}

// Run the script
fixForeignKeys() 