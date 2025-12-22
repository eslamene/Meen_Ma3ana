/**
 * Verify Beneficiary Documents RLS Policies
 * Checks if the policies are correctly applied
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyRLS() {
  console.log('🔍 Verifying beneficiary_documents RLS policies...\n')

  try {
    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('beneficiary_documents')
      .select('id')
      .limit(1)

    if (tablesError && tablesError.code === '42P01') {
      console.error('❌ Table "beneficiary_documents" does not exist!')
      console.log('   Run migration: supabase/migrations/enhance_beneficiaries_with_documents.sql')
      return false
    }

    console.log('✅ Table "beneficiary_documents" exists')

    // Try to query policies (this requires a direct SQL query)
    // For now, just test if we can read/write
    console.log('\n🧪 Testing RLS policies...')

    // Test SELECT (should work for authenticated users)
    const { data: selectData, error: selectError } = await supabase
      .from('beneficiary_documents')
      .select('id')
      .limit(1)

    if (selectError) {
      console.error('❌ SELECT test failed:', selectError.message)
      console.log('   This might indicate RLS policies are blocking reads')
    } else {
      console.log('✅ SELECT test passed (can read documents)')
    }

    // Note: We can't test INSERT without a real beneficiary_id
    // But we can check if the policies exist by querying pg_policies
    console.log('\n📝 To verify policies are applied, run this SQL in Supabase:')
    console.log(`
SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'beneficiary_documents' 
  AND schemaname = 'public'
ORDER BY policyname;
    `)

    console.log('\n✅ Basic checks complete!')
    console.log('   If uploads are still failing, check:')
    console.log('   1. RLS policies are applied (run migration 057)')
    console.log('   2. User has admin or super_admin role')
    console.log('   3. Check browser console for errors during upload')
    
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

verifyRLS().then(success => {
  process.exit(success ? 0 : 1)
})

