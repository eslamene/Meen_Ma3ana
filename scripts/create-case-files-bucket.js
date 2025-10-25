require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease add these to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCaseFilesBucket() {
  console.log('🗂️  Creating case-files storage bucket...\n');

  try {
    // Create the bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('case-files', {
      public: false, // Private bucket for security
      allowedMimeTypes: [
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        // Spreadsheets
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Videos
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/avi',
        // Audio
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/m4a'
      ],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket "case-files" already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Created bucket "case-files"');
    }

    // Create RLS policies for the bucket
    console.log('\n🔒 Setting up Row Level Security policies...\n');

    // Policy 1: Allow authenticated users to view files they have permission to see
    const viewPolicy = `
      CREATE POLICY "case_files_view_policy" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'case-files' AND
        auth.role() = 'authenticated' AND
        (
          -- Allow users to view files from cases they can access
          EXISTS (
            SELECT 1 FROM cases 
            WHERE cases.id = split_part(name, '/', 1)::uuid
            AND (
              -- Case creators can see their files
              cases.created_by = auth.uid() OR
              -- Admins can see all files
              EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
              )
            )
          )
        )
      );
    `;

    // Policy 2: Allow authenticated users to upload files to cases they can edit
    const uploadPolicy = `
      CREATE POLICY "case_files_upload_policy" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'case-files' AND
        auth.role() = 'authenticated' AND
        (
          -- Allow users to upload files to cases they can edit
          EXISTS (
            SELECT 1 FROM cases 
            WHERE cases.id = split_part(name, '/', 1)::uuid
            AND (
              -- Case creators can upload files
              cases.created_by = auth.uid() OR
              -- Admins can upload files to any case
              EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
              )
            )
          )
        )
      );
    `;

    // Policy 3: Allow users to delete files they uploaded or admins to delete any
    const deletePolicy = `
      CREATE POLICY "case_files_delete_policy" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'case-files' AND
        auth.role() = 'authenticated' AND
        (
          -- File uploader can delete their own files
          owner = auth.uid() OR
          -- Admins can delete any file
          EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
          )
        )
      );
    `;

    // Apply the policies
    try {
      await supabase.rpc('exec_sql', { sql: viewPolicy });
      console.log('✅ Created view policy');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ View policy already exists');
      } else {
        console.log('⚠️  View policy error:', error.message);
      }
    }

    try {
      await supabase.rpc('exec_sql', { sql: uploadPolicy });
      console.log('✅ Created upload policy');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Upload policy already exists');
      } else {
        console.log('⚠️  Upload policy error:', error.message);
      }
    }

    try {
      await supabase.rpc('exec_sql', { sql: deletePolicy });
      console.log('✅ Created delete policy');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Delete policy already exists');
      } else {
        console.log('⚠️  Delete policy error:', error.message);
      }
    }

    console.log('\n🎉 Case files storage bucket setup complete!');
    console.log('\n📋 Bucket Configuration:');
    console.log('   - Name: case-files');
    console.log('   - Public: No (Private)');
    console.log('   - File Size Limit: 50MB');
    console.log('   - Allowed Types: Images, Documents, Videos, Audio');
    console.log('   - Security: Row Level Security enabled');
    
    console.log('\n🔒 Security Policies:');
    console.log('   - Users can view files from cases they have access to');
    console.log('   - Users can upload files to cases they can edit');
    console.log('   - Users can delete files they uploaded');
    console.log('   - Admins have full access to all files');

  } catch (error) {
    console.error('❌ Error creating case-files bucket:', error.message);
    process.exit(1);
  }
}

// Run the setup
createCaseFilesBucket();

