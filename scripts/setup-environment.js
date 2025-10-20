const fs = require('fs')
const path = require('path')
require('dotenv').config()

console.log('🔧 Setting up environment variables...\n')

// Read the current .env file
const envPath = path.join(process.cwd(), '.env')
let envContent = ''

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
} else {
  console.log('📝 Creating new .env file...')
}

// Function to properly encode the DATABASE_URL
function encodeDatabaseUrl() {
  const password = 'GpI41rvz5Y!&PnN' // The actual password
  // encodeURIComponent does not encode '!'; force-encode it to %21 as some parsers choke
  const encodedPassword = encodeURIComponent(password).replace(/!/g, '%21')
  
  return `postgresql://postgres.pmqqjfwpwmdcasheygsw:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
}

// Update or add DATABASE_URL
const newDatabaseUrl = encodeDatabaseUrl()
const databaseUrlRegex = /^DATABASE_URL=.*$/m

if (databaseUrlRegex.test(envContent)) {
  envContent = envContent.replace(databaseUrlRegex, `DATABASE_URL=${newDatabaseUrl}`)
  console.log('✅ Updated existing DATABASE_URL')
} else {
  envContent += `\n# Database Configuration\nDATABASE_URL=${newDatabaseUrl}\n`
  console.log('✅ Added new DATABASE_URL')
}

// Ensure other required variables exist
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://pmqqjfwpwmdcasheygsw.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcXFqZndwd21kY2FzaGV5Z3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTYxMzYsImV4cCI6MjA2OTczMjEzNn0.u5g3mLtQKzZs0eeHt5hZ8NR8EFKhzCRSI2bJ6VKGWn4',
  'SUPABASE_SERVICE_ROLE_KEY': 'your_service_role_key_here', // You need to add this manually
  'NEXTAUTH_SECRET': 'nXeE+3mGWmb2VIZEdcmJ+GaST79oe9DwWmh0Y7qRF58=',
  'NEXTAUTH_URL': 'http://localhost:3000',
  'NODE_ENV': 'development'
}

for (const [key, defaultValue] of Object.entries(requiredVars)) {
  const regex = new RegExp(`^${key}=.*$`, 'm')
  
  if (regex.test(envContent)) {
    console.log(`✅ ${key} already exists`)
  } else {
    envContent += `${key}=${defaultValue}\n`
    console.log(`✅ Added ${key}`)
  }
}

// Write the updated .env file
fs.writeFileSync(envPath, envContent.trim() + '\n')

console.log('\n🎉 Environment setup complete!')
console.log('\n📝 Important notes:')
console.log('1. Make sure to add your SUPABASE_SERVICE_ROLE_KEY manually')
console.log('2. The DATABASE_URL is now properly URL-encoded')
console.log('3. All required environment variables are set')
console.log('\n🚀 Next steps:')
console.log('1. Add your SUPABASE_SERVICE_ROLE_KEY to .env')
console.log('2. Run: npm run setup:storage')
console.log('3. Run: npm run dev') 