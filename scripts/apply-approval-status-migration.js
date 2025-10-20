const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function applyMigration() {
  try {
    console.log('Applying contribution approval status migration...');
    
    // Create the contribution_approval_status table
    await sql`
      CREATE TABLE IF NOT EXISTS "contribution_approval_status" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "contribution_id" uuid NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "admin_id" uuid,
        "rejection_reason" text,
        "admin_comment" text,
        "donor_reply" text,
        "donor_reply_date" timestamp,
        "payment_proof_url" text,
        "resubmission_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;

    // Add foreign key constraints
    await sql`
      ALTER TABLE "contribution_approval_status" 
      ADD CONSTRAINT "contribution_approval_status_contribution_id_contributions_id_fk" 
      FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") 
      ON DELETE cascade ON UPDATE no action;
    `;

    await sql`
      ALTER TABLE "contribution_approval_status" 
      ADD CONSTRAINT "contribution_approval_status_admin_id_users_id_fk" 
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") 
      ON DELETE no action ON UPDATE no action;
    `;

    console.log('✅ Migration applied successfully!');
    
    // Initialize approval status for existing contributions
    console.log('Initializing approval status for existing contributions...');
    
    const existingContributions = await sql`
      SELECT id, status FROM contributions 
      WHERE id NOT IN (SELECT contribution_id FROM contribution_approval_status)
    `;
    
    for (const contribution of existingContributions) {
      await sql`
        INSERT INTO contribution_approval_status (contribution_id, status, created_at, updated_at)
        VALUES (${contribution.id}, ${contribution.status}, now(), now())
      `;
    }
    
    console.log(`✅ Initialized approval status for ${existingContributions.length} existing contributions`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

applyMigration(); 