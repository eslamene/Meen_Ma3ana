const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createApprovalStatusTable() {
  try {
    console.log('🔄 Creating contribution_approval_status table...')
    
    // Create the table using SQL
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS contribution_approval_status (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          contribution_id uuid NOT NULL,
          status text DEFAULT 'pending' NOT NULL,
          admin_id uuid,
          rejection_reason text,
          admin_comment text,
          donor_reply text,
          donor_reply_date timestamp,
          payment_proof_url text,
          resubmission_count integer DEFAULT 0,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );
      `
    })

    if (createTableError) {
      console.log('⚠️  Table might already exist, trying alternative approach...')
      
      // Try creating with a different approach
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contribution_approval_status') THEN
              CREATE TABLE contribution_approval_status (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                contribution_id uuid NOT NULL,
                status text DEFAULT 'pending' NOT NULL,
                admin_id uuid,
                rejection_reason text,
                admin_comment text,
                donor_reply text,
                donor_reply_date timestamp,
                payment_proof_url text,
                resubmission_count integer DEFAULT 0,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
              );
            END IF;
          END $$;
        `
      })

      if (alterError) {
        console.error('❌ Failed to create table:', alterError)
        return
      }
    }

    console.log('✅ Table created successfully!')
    
    // Add foreign key constraints
    console.log('🔄 Adding foreign key constraints...')
    
    const { error: fk1Error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contribution_approval_status_contribution_id_fkey'
          ) THEN
            ALTER TABLE contribution_approval_status 
            ADD CONSTRAINT contribution_approval_status_contribution_id_fkey 
            FOREIGN KEY (contribution_id) REFERENCES contributions(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `
    })

    if (fk1Error) {
      console.log('⚠️  First foreign key constraint might already exist')
    }

    const { error: fk2Error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contribution_approval_status_admin_id_fkey'
          ) THEN
            ALTER TABLE contribution_approval_status 
            ADD CONSTRAINT contribution_approval_status_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `
    })

    if (fk2Error) {
      console.log('⚠️  Second foreign key constraint might already exist')
    }

    console.log('✅ Foreign key constraints added!')
    
    // Initialize approval status for existing contributions
    console.log('🔄 Initializing approval status for existing contributions...')
    
    const { data: existingContributions, error: fetchError } = await supabase
      .from('contributions')
      .select('id, status')
      .not('id', 'in', `(SELECT contribution_id FROM contribution_approval_status)`)
    
    if (fetchError) {
      console.error('❌ Error fetching existing contributions:', fetchError)
      return
    }

    if (existingContributions && existingContributions.length > 0) {
      const approvalStatusRecords = existingContributions.map(contribution => ({
        contribution_id: contribution.id,
        status: contribution.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('contribution_approval_status')
        .insert(approvalStatusRecords)

      if (insertError) {
        console.error('❌ Error initializing approval status:', insertError)
        return
      }

      console.log(`✅ Initialized approval status for ${existingContributions.length} existing contributions`)
    } else {
      console.log('ℹ️  No existing contributions found or all already have approval status')
    }

    console.log('🎉 Database setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
  }
}

createApprovalStatusTable() 