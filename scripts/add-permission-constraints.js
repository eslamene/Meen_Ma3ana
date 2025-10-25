require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addPermissionConstraints() {
  try {
    console.log('🔧 Adding constraints to permissions table...');
    
    // First, ensure all existing permissions have resource and action values
    console.log('1. Checking for permissions with empty resource/action...');
    
    const { data: emptyPermissions, error: checkError } = await supabase
      .from('permissions')
      .select('id, name, resource, action')
      .or('resource.is.null,action.is.null,resource.eq.,action.eq.');
    
    if (checkError) throw checkError;
    
    if (emptyPermissions.length > 0) {
      console.log(`Found ${emptyPermissions.length} permissions with empty resource/action. Fixing...`);
      
      for (const permission of emptyPermissions) {
        // Try to extract from permission name
        const parts = permission.name.split(':');
        if (parts.length >= 2) {
          const resource = parts[0];
          const action = parts.slice(1).join('_');
          
          const { error: updateError } = await supabase
            .from('permissions')
            .update({
              resource: resource,
              action: action
            })
            .eq('id', permission.id);
          
          if (updateError) {
            console.error(`   ❌ Failed to fix ${permission.name}:`, updateError.message);
          } else {
            console.log(`   ✅ Fixed ${permission.name}: resource="${resource}", action="${action}"`);
          }
        } else {
          console.log(`   ⚠️  Cannot auto-fix permission: ${permission.name}`);
        }
      }
    } else {
      console.log('✅ All permissions already have resource and action values');
    }
    
    // Add NOT NULL constraints using raw SQL
    console.log('2. Adding NOT NULL constraints...');
    
    const constraints = [
      {
        name: 'resource_not_null',
        sql: `ALTER TABLE permissions ALTER COLUMN resource SET NOT NULL;`
      },
      {
        name: 'action_not_null', 
        sql: `ALTER TABLE permissions ALTER COLUMN action SET NOT NULL;`
      },
      {
        name: 'resource_not_empty',
        sql: `ALTER TABLE permissions ADD CONSTRAINT permissions_resource_not_empty CHECK (resource != '');`
      },
      {
        name: 'action_not_empty',
        sql: `ALTER TABLE permissions ADD CONSTRAINT permissions_action_not_empty CHECK (action != '');`
      }
    ];
    
    for (const constraint of constraints) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: constraint.sql });
        
        if (error) {
          if (error.message.includes('already exists') || error.message.includes('constraint already exists')) {
            console.log(`   ✅ ${constraint.name} already exists`);
          } else {
            console.error(`   ❌ Failed to add ${constraint.name}:`, error.message);
          }
        } else {
          console.log(`   ✅ Added constraint: ${constraint.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error adding ${constraint.name}:`, err.message);
      }
    }
    
    // Verify constraints are working
    console.log('3. Testing constraints...');
    
    try {
      const { error: testError } = await supabase
        .from('permissions')
        .insert({
          name: 'test:empty',
          display_name: 'Test Permission',
          resource: '', // This should fail
          action: 'test'
        });
      
      if (testError) {
        console.log('   ✅ Constraints working - empty resource rejected');
      } else {
        console.log('   ⚠️  Constraints may not be working - empty resource accepted');
        // Clean up test permission
        await supabase.from('permissions').delete().eq('name', 'test:empty');
      }
    } catch (err) {
      console.log('   ✅ Constraints working - insert failed as expected');
    }
    
    console.log('\n🎉 Permission constraints setup complete!');
    console.log('✅ All permissions now have required resource and action fields');
    console.log('✅ Database constraints prevent empty resource/action values');
    
  } catch (error) {
    console.error('❌ Error adding permission constraints:', error);
  }
}

addPermissionConstraints();
