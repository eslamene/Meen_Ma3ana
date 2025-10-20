# Database Setup Guide

This guide will help you set up the database for the Meen Ma3ana charity platform.

## Current Issue

The database migration system is out of sync with the actual database state. Some tables already exist but the migration system is trying to create them again.

## Solution Options

### Option 1: Reset Database (Recommended for Development)

If you're in development and can lose existing data:

1. **Drop all tables and start fresh:**
   ```bash
   # Connect to your Supabase database and run:
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

### Option 2: Manual Table Creation (If you want to keep existing data)

If you want to keep existing data, manually create the missing tables:

1. **Check what tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Create missing tables manually:**
   ```sql
   -- Create contributions table if it doesn't exist
   CREATE TABLE IF NOT EXISTS "contributions" (
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
   );

   -- Add foreign key constraints
   ALTER TABLE "contributions" 
   ADD CONSTRAINT "contributions_donor_id_users_id_fk" 
   FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") 
   ON DELETE no action ON UPDATE no action;

   ALTER TABLE "contributions" 
   ADD CONSTRAINT "contributions_case_id_cases_id_fk" 
   FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") 
   ON DELETE no action ON UPDATE no action;

   ALTER TABLE "contributions" 
   ADD CONSTRAINT "contributions_project_id_projects_id_fk" 
   FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") 
   ON DELETE no action ON UPDATE no action;

   ALTER TABLE "contributions" 
   ADD CONSTRAINT "contributions_project_cycle_id_project_cycles_id_fk" 
   FOREIGN KEY ("project_cycle_id") REFERENCES "public"."project_cycles"("id") 
   ON DELETE no action ON UPDATE no action;
   ```

### Option 3: Fix Migration State

If you want to fix the migration system:

1. **Mark migrations as applied:**
   ```bash
   # This will mark all existing migrations as applied
   npm run db:migrate -- --force
   ```

2. **Or manually update the migration journal:**
   Edit `drizzle/migrations/meta/_journal.json` to reflect the current state.

## Verification

After setting up the database, verify that:

1. **All tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Foreign key constraints are correct:**
   ```sql
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
     AND tc.table_name = 'contributions';
   ```

## Troubleshooting

### Common Issues

1. **"relation already exists" error:**
   - The table already exists but migration is trying to create it
   - Solution: Use Option 1 or 2 above

2. **"foreign key constraint" error:**
   - Missing foreign key relationships
   - Solution: Add the constraints manually using Option 2

3. **"SASL signature mismatch" error:**
   - Database connection issue
   - Solution: Check your Supabase credentials and connection string

### Getting Help

If you encounter issues:

1. Check the Supabase dashboard for your database status
2. Verify your connection string in `drizzle.config.ts`
3. Check the application logs for specific error messages
4. Use Drizzle Studio to inspect the database: `npm run db:studio`

## Next Steps

After setting up the database:

1. **Test the application:**
   ```bash
   npm run dev
   ```

2. **Visit the admin contributions page:**
   - Go to `/en/admin/contributions`
   - Should show the contribution moderation interface

3. **Create test data:**
   - Use the application to create test cases and contributions
   - Verify that foreign key relationships work correctly

## Environment Variables

Make sure your `.env` file has the correct database URL:

```env
DATABASE_URL=postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

The database URL should match what's in your `drizzle.config.ts` file. 