#!/usr/bin/env node

/**
 * fix-foreign-key-names.js
 * Script to rename foreign key constraints to match Supabase's expected naming
 */

import postgres from 'postgres'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const connectionString = 'postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y%21%256PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function fixForeignKeyNames() {
  const client = postgres(connectionString, {
    ssl: 'require'
  })

  try {
    console.log('Fixing foreign key constraint names...')
    
    // Check existing foreign key constraints
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
    
    console.log('Current foreign key constraints:')
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`)
    })
    
    // Drop and recreate constraints with correct names
    for (const constraint of constraints) {
      console.log(`Dropping constraint: ${constraint.constraint_name}`)
      await client.unsafe(`ALTER TABLE "contributions" DROP CONSTRAINT "${constraint.constraint_name}"`)
    }
    
    // Recreate constraints with Supabase's expected naming
    console.log('Creating constraints with correct names...')
    
    // contributions_donor_id_fkey
    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_donor_id_fkey" 
      FOREIGN KEY ("donor_id") REFERENCES "users"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `
    console.log('✅ Created contributions_donor_id_fkey')
    
    // contributions_case_id_fkey
    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_case_id_fkey" 
      FOREIGN KEY ("case_id") REFERENCES "cases"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `
    console.log('✅ Created contributions_case_id_fkey')
    
    // contributions_project_id_fkey
    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_project_id_fkey" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `
    console.log('✅ Created contributions_project_id_fkey')
    
    // contributions_project_cycle_id_fkey
    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_project_cycle_id_fkey" 
      FOREIGN KEY ("project_cycle_id") REFERENCES "project_cycles"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `
    console.log('✅ Created contributions_project_cycle_id_fkey')
    
    // Verify the new constraints
    const newConstraints = await client`
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
    
    console.log('\n✅ New foreign key constraints:')
    newConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`)
    })
    
    console.log('\n✅ All foreign key constraints have been updated to match Supabase\'s expected naming!')
    
  } catch (error) {
    console.error('Error fixing foreign key names:', error)
  } finally {
    await client.end()
  }
}

fixForeignKeyNames() 