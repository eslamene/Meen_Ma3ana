import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  try {
    console.log('🔍 Testing anon upload to contributions bucket...')

    // Minimal 1x1 transparent PNG
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const fileName = `policy-test-${Date.now()}.png`
    const { data, error } = await supabase.storage
      .from('contributions')
      .upload(fileName, pngData, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png'
      })

    if (error) {
      console.error('❌ Anon upload failed:', error)
      process.exit(1)
    }

    console.log('✅ Anon upload succeeded:', data.path)

    const { data: pub } = supabase.storage.from('contributions').getPublicUrl(fileName)
    console.log('🌐 Public URL:', pub.publicUrl)

    // Cleanup
    const { error: delErr } = await supabase.storage.from('contributions').remove([fileName])
    if (delErr) console.log('⚠️ Cleanup failed (ok for test):', delErr.message)
    else console.log('🧹 Cleaned up test file')
  } catch (e) {
    console.error('❌ Unexpected error:', e)
    process.exit(1)
  }
}

run()