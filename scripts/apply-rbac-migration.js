require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyRBACMigration() {
  try {
    console.log('Applying RBAC migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'drizzle', 'migrations', '0005_create_rbac_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          // Try alternative approach if exec_sql doesn't work
          console.log('exec_sql failed, trying direct query...');
          
          // For CREATE TABLE statements, we can try using the REST API
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            console.log('Skipping CREATE TABLE - will handle manually');
            continue;
          }
          
          throw error;
        }
        
        console.log(`✓ Statement ${i + 1} executed successfully`);
      } catch (statementError) {
        console.error(`❌ Error executing statement ${i + 1}:`, statementError.message);
        console.log('Statement:', statement.substring(0, 100) + '...');
        
        // Continue with other statements
        continue;
      }
    }

    console.log('\n🎉 RBAC migration completed!');
    console.log('\nNote: If some statements failed, you may need to run them manually in the Supabase SQL editor.');
    
  } catch (error) {
    console.error('❌ Error applying RBAC migration:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  applyRBACMigration();
}

module.exports = { applyRBACMigration };
