#!/usr/bin/env node

/**
 * Script to help apply Supabase email templates
 * 
 * This script reads the HTML templates and provides instructions
 * for applying them to Supabase via the dashboard or API.
 * 
 * Usage:
 *   node scripts/apply-email-templates.js
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templatesDir = join(__dirname, '..', 'supabase', 'email-templates')

const templates = [
  {
    name: 'Password Reset',
    file: 'password-reset.html',
    supabaseType: 'password-reset',
    description: 'Email sent when user requests password reset'
  },
  {
    name: 'Email Confirmation',
    file: 'email-confirmation.html',
    supabaseType: 'confirm-signup',
    description: 'Email sent to confirm new user signup'
  },
  {
    name: 'Magic Link',
    file: 'magic-link.html',
    supabaseType: 'magic-link',
    description: 'Email sent with magic link for passwordless sign-in'
  },
  {
    name: 'Change Email',
    file: 'change-email.html',
    supabaseType: 'change-email',
    description: 'Email sent to confirm email address change'
  },
  {
    name: 'Reauthentication',
    file: 'reauthentication.html',
    supabaseType: 'reauthentication',
    description: 'Email sent to confirm user reauthentication for security-sensitive actions'
  },
  {
    name: 'Invite User',
    file: 'invite-user.html',
    supabaseType: 'invite',
    description: 'Email sent when a user is invited to join the platform'
  }
]

console.log('📧 Meen Ma3ana Email Templates\n')
console.log('=' .repeat(60))
console.log('\nAvailable Templates:\n')

templates.forEach((template, index) => {
  const filePath = join(templatesDir, template.file)
  try {
    const content = readFileSync(filePath, 'utf-8')
    const size = (content.length / 1024).toFixed(2)
    console.log(`${index + 1}. ${template.name}`)
    console.log(`   File: ${template.file}`)
    console.log(`   Size: ${size} KB`)
    console.log(`   Type: ${template.supabaseType}`)
    console.log(`   Description: ${template.description}`)
    console.log('')
  } catch (error) {
    console.error(`   ❌ Error reading ${template.file}:`, error.message)
  }
})

console.log('=' .repeat(60))
console.log('\n📋 How to Apply Templates:\n')
console.log('Option 1: Supabase Dashboard (Recommended)')
console.log('  1. Go to your Supabase project dashboard')
console.log('  2. Navigate to Authentication → Email Templates')
console.log('  3. For each template:')
console.log('     - Select the template type')
console.log('     - Click "Edit Template"')
console.log('     - Copy the HTML from the corresponding file')
console.log('     - Paste and save\n')

console.log('Option 2: Using Supabase Management API')
console.log('  See supabase/email-templates/README.md for API instructions\n')

console.log('Template Files Location:')
console.log(`  ${templatesDir}\n`)

console.log('✨ All templates are ready to use!')
console.log('   They match your landing page design with brand colors:')
console.log('   - Primary: #6B8E7E (Meen)')
console.log('   - Secondary: #E74C3C (Ma3ana)\n')

