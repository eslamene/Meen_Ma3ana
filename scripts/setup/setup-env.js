#!/usr/bin/env node

/**
 * setup-env.js
 * Environment setup script for Meen Ma3ana project
 */

import fs from 'fs'
import path from 'path'

const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pmqqjfwpwmdcasheygsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Optional: Environment
NODE_ENV=development

# Task Master Configuration (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
`

function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env')
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Skipping creation.')
    return
  }
  
  try {
    fs.writeFileSync(envPath, envTemplate)
    console.log('✅ Created .env file with template configuration')
    console.log('📝 Please update the following values in your .env file:')
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Get this from your Supabase project settings')
    console.log('   - NEXTAUTH_SECRET: Generate a random string for session security')
    console.log('   - ANTHROPIC_API_KEY: Your Anthropic API key (optional, for task management)')
    console.log('   - PERPLEXITY_API_KEY: Your Perplexity API key (optional, for research)')
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message)
  }
}

function showInstructions() {
  console.log('\n📋 Setup Instructions:')
  console.log('1. Get your Supabase anon key from: https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw/settings/api')
  console.log('2. Update the NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file')
  console.log('3. Generate a NEXTAUTH_SECRET (you can use: openssl rand -base64 32)')
  console.log('4. Restart your development server')
  console.log('\n🔗 Useful Links:')
  console.log('- Supabase Dashboard: https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw')
  console.log('- Database Connection: Check the connection string in drizzle.config.ts')
}

// Run the setup
createEnvFile()
showInstructions() 