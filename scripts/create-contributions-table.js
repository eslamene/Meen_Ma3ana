#!/usr/bin/env node

/**
 * create-contributions-table.js
 * Script to manually create the contributions table
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Use the same connection string as in drizzle.config.ts
const connectionString = 'postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function createContributionsTable() {
  const client = postgres(connectionString, {
    ssl: 'require'
  })

  try {
    console.log('Creating contributions table...')
    
    // Check if table already exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contributions'
      )
    `
    
    if (tableExists[0].exists) {
      console.log('✅ Contributions table already exists')
      return
    }

    // Create the contributions table
    await client`
      CREATE TABLE "contributions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "type" text NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "payment_method" text NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "proof_of_payment" text,
        "donor_id" uuid NOT NULL,
        "case_id" uuid,
        "project_id" uuid,
        "project_cycle_id" uuid,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `

    // Add foreign key constraints
    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_donor_id_users_id_fk" 
      FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") 
      ON DELETE no action ON UPDATE no action
    `

    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_case_id_cases_id_fk" 
      FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") 
      ON DELETE no action ON UPDATE no action
    `

    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_project_id_projects_id_fk" 
      FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") 
      ON DELETE no action ON UPDATE no action
    `

    await client`
      ALTER TABLE "contributions" 
      ADD CONSTRAINT "contributions_project_cycle_id_project_cycles_id_fk" 
      FOREIGN KEY ("project_cycle_id") REFERENCES "public"."project_cycles"("id") 
      ON DELETE no action ON UPDATE no action
    `

    console.log('✅ Contributions table created successfully with all foreign key constraints')
    
  } catch (error) {
    console.error('❌ Error creating contributions table:', error)
  } finally {
    await client.end()
  }
}

// Run the script
createContributionsTable() 