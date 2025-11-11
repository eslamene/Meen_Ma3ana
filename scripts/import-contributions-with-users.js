/**
 * Step 2: Import Contributions with User Accounts
 * 
 * This script:
 * 1. Creates Supabase Auth users for each unique ContributorID
 * 2. Creates corresponding records in the users table
 * 3. Creates cases from CSV data
 * 4. Creates contributions linked to proper user accounts
 * 5. Creates approval statuses
 * 6. Creates notifications
 * 
 * CSV Structure:
 * - ID: Case ID
 * - Description: Case description (Arabic)
 * - Contributor: Contributor name
 * - ContributorID: Unique contributor identifier (100 = unknown)
 * - Amount: Contribution amount
 * - Month: Date (DD/MM/YYYY)
 * 
 * Requirements:
 * - Run scripts/01-clear-all-data.js first
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - NEXT_PUBLIC_SUPABASE_URL in .env.local
 * - contributions.csv in docs/cases/
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to generate email from contributor ID and name
function generateEmail(contributorId, contributorName) {
  // Special handling for unknown contributors (ContributorID = 100)
  if (contributorId === 100) {
    return 'unknown@contributor.meenma3ana.local'
  }
  
  // Always use ContributorID-based email format (no Arabic names)
  // Format: contributor<ContributorID>@contributor.meenma3ana.local
  const cleanId = contributorId.toString().padStart(4, '0')
  
  return `contributor${cleanId}@contributor.meenma3ana.local`
}

// Helper function to generate a secure password
function generatePassword() {
  // Generate a random password that users can reset later
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Fetch all users with pagination
async function getAllAuthUsers() {
  const allUsers = []
  let page = 1
  const perPage = 1000 // Max per page
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })
    
    if (error) {
      console.error(`   ⚠️  Error fetching users page ${page}:`, error.message)
      break
    }
    
    if (!data?.users || data.users.length === 0) {
      break
    }
    
    allUsers.push(...data.users)
    
    // If we got fewer than perPage, we've reached the end
    if (data.users.length < perPage) {
      break
    }
    
    page++
  }
  
  return allUsers
}

// Create auth user and app user record
async function createContributorUser(contributorId, contributorName, usersByEmailCache = null) {
  // Handle ContributorID = 100 (unknown contributor)
  const email = generateEmail(contributorId, contributorName)
  const displayName = contributorId === 100 
    ? (contributorName && contributorName.trim() !== '' ? contributorName : 'Unknown Contributor')
    : contributorName
  
  // Check if user already exists in auth (by email)
  // Use cache if provided, otherwise fetch all users
  let existingAuthUser = null
  if (usersByEmailCache) {
    existingAuthUser = usersByEmailCache.get(email)
  } else {
    const existingAuthUsers = await getAllAuthUsers()
    existingAuthUser = existingAuthUsers.find(u => u.email === email)
  }
  
  if (existingAuthUser) {
    console.log(`   ✓ User already exists: ${email} (UUID: ${existingAuthUser.id})`)
    
    // Verify app user record exists
    const { data: existingAppUser } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('id', existingAuthUser.id)
      .single()
    
    if (!existingAppUser) {
      // Create app user record if it doesn't exist
      console.log(`   ⚠️  App user record missing, creating...`)
      const { error: appErr } = await supabase
        .from('users')
        .upsert({
          id: existingAuthUser.id,
          email: email,
          role: 'donor',
          first_name: displayName,
          is_active: true,
          email_verified: true,
          language: 'ar',
        }, { onConflict: 'id' })
      
      if (appErr) {
        console.error(`   ⚠️  Could not create app user record:`, appErr.message)
      } else {
        console.log(`   ✓ Created app user record`)
      }
    }
    
    return existingAuthUser.id
  }
  
  // Retry logic for user creation (handles rate limits)
  let retries = 3
  let delay = 1000 // Start with 1 second delay
  
  while (retries > 0) {
    try {
      // Create auth user
      const password = generatePassword()
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email so they can login
        user_metadata: {
          contributor_id: contributorId,
          contributor_name: displayName,
          original_name: displayName,
          created_by_import: true,
          import_date: new Date().toISOString()
        }
      })
      
      if (authError) {
        // Check if it's a rate limit or temporary error
        if (authError.status === 429 || authError.status === 500 || authError.status === 503) {
          // For 500 errors, check if user was actually created (trigger might have failed but user exists)
          if (authError.status === 500) {
            // Wait a bit and check if user exists
            await new Promise(resolve => setTimeout(resolve, 1000))
            // Refresh cache and check
            let createdUser = null
            if (usersByEmailCache) {
              const checkUsers = await getAllAuthUsers()
              checkUsers.forEach(user => usersByEmailCache.set(user.email, user))
              createdUser = usersByEmailCache.get(email)
            } else {
              const checkUsers = await getAllAuthUsers()
              createdUser = checkUsers.find(u => u.email === email)
            }
            
            if (createdUser) {
              console.log(`   ⚠️  Auth user created but trigger failed: ${email}`)
              console.log(`   ✓ Using existing auth user`)
              
              // Try to create app user
              const { data: existingAppUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', createdUser.id)
                .single()
              
              if (!existingAppUser) {
                // Create app user
                const { error: appErr } = await supabase
                  .from('users')
                  .upsert({
                    id: createdUser.id,
                    email: email,
                    role: 'donor',
                    first_name: displayName,
                    is_active: true,
                    email_verified: true,
                    language: 'ar',
                  }, { onConflict: 'id' })
                
                if (appErr) {
                  console.error(`   ⚠️  Could not create app user:`, appErr.message)
                } else {
                  console.log(`   ✓ Created app user record`)
                }
              }
              
              return createdUser.id
            }
          }
          
          retries--
          if (retries > 0) {
            console.log(`   ⏳ Rate limit/database error (${authError.status}), waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff
            continue
          }
        }
        
        // Handle "user already exists" error gracefully
        if (authError.message && authError.message.includes('already been registered')) {
          console.log(`   ⚠️  User already exists, fetching existing user...`)
          
          // Fetch the existing user (use cache if available, otherwise fetch)
          let existingUser = null
          if (usersByEmailCache) {
            existingUser = usersByEmailCache.get(email)
            // If not in cache, refresh cache
            if (!existingUser) {
              const checkUsers = await getAllAuthUsers()
              checkUsers.forEach(user => usersByEmailCache.set(user.email, user))
              existingUser = usersByEmailCache.get(email)
            }
          } else {
            const checkUsers = await getAllAuthUsers()
            existingUser = checkUsers.find(u => u.email === email)
          }
          
          if (existingUser) {
            console.log(`   ✓ Found existing user: ${email} (UUID: ${existingUser.id})`)
            
            // Ensure app user record exists
            const { data: existingAppUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', existingUser.id)
              .single()
            
            if (!existingAppUser) {
              const { error: appErr } = await supabase
                .from('users')
                .upsert({
                  id: existingUser.id,
                  email: email,
                  role: 'donor',
                  first_name: displayName,
                  is_active: true,
                  email_verified: true,
                  language: 'ar',
                }, { onConflict: 'id' })
              
              if (appErr) {
                console.error(`   ⚠️  Could not create app user:`, appErr.message)
              } else {
                console.log(`   ✓ Created app user record`)
              }
            }
            
            return existingUser.id
          } else {
            console.error(`   ❌ User should exist but not found: ${email}`)
            throw authError
          }
        }
        
        // If it's a different error, log it and throw
        console.error(`   ❌ Auth API error:`, authError.message)
        throw authError
      }
      
      console.log(`   ✓ Created auth user: ${email}`)
      
      // Wait a bit for any database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create app user record
      // Use upsert in case trigger already created it or there's a conflict
      const { data: appUser, error: appError } = await supabase
        .from('users')
        .upsert({
          id: authUser.user.id,
          email: email,
          role: 'donor',
          first_name: displayName,
          last_name: null, // Can be updated by admin later
          is_active: true,
          email_verified: true,
          language: 'ar', // Default to Arabic
        }, {
          onConflict: 'id'
        })
        .select()
        .single()
      
      if (appError) {
        console.error(`   ❌ Error creating app user for ContributorID ${contributorId}:`, appError)
        
        // Check if user already exists (maybe created by trigger)
        const { data: existingAppUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.user.id)
          .single()
        
        if (existingAppUser) {
          console.log(`   ✓ App user already exists (likely created by trigger)`)
          return authUser.user.id
        }
        
        // Try to delete auth user if app user creation fails
        try {
          await supabase.auth.admin.deleteUser(authUser.user.id)
        } catch (deleteError) {
          console.error(`   ⚠️  Could not delete auth user after app user creation failed:`, deleteError.message)
        }
        throw appError
      }
      
      console.log(`   ✓ Created app user record: ${contributorName} (ID: ${contributorId})`)
      return authUser.user.id
      
    } catch (error) {
      retries--
      if (retries > 0 && (error.status === 429 || error.status === 500 || error.status === 503)) {
        console.log(`   ⏳ Error (${error.status}), retrying in ${delay}ms... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2
        continue
      }
      throw error
    }
  }
  
  throw new Error('Failed to create user after retries')
}

// Helper function to parse date from CSV format (DD/MM/YYYY)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.trim().split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10)
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day)
      // Validate date
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  return null
}

// Helper function to convert date string to ISO string
function dateStrToISO(dateStr) {
  const parsed = parseDate(dateStr)
  if (parsed) {
    return parsed.toISOString()
  }
  return null
}

// Parse CSV line properly handling commas in Arabic text
function parseCSVLine(line) {
  const parts = []
  let current = ''
  let inQuotes = false
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current.trim())
  return parts
}

// Helper function to categorize case by Arabic title
function categorizeCase(titleAr) {
  if (!titleAr) return 'other'
  
  const title = titleAr.toLowerCase()
  
  // Medical Support
  if (title.includes('مريض') || title.includes('دوا') || title.includes('أدويه') || 
      title.includes('علاج') || title.includes('عمليه') || title.includes('كانسر') ||
      title.includes('مستشفي') || title.includes('أشعه') || title.includes('سنان') ||
      title.includes('ضروس') || title.includes('قلب') || title.includes('حروق') ||
      title.includes('روماتيزم') || title.includes('تخاطب') || title.includes('جلسات') ||
      title.includes('سكر') || title.includes('شهريات')) {
    return 'medical'
  }
  
  // Educational Assistance
  if (title.includes('مدرسه') || title.includes('مدارس') || title.includes('دروس') ||
      title.includes('تعليم') || title.includes('مصاريف') || title.includes('مصاريف مدارس') ||
      title.includes('لاب توب') || title.includes('لاب توب')) {
    return 'educational'
  }
  
  // Housing & Rent
  if (title.includes('ايجار') || title.includes('إيجار') || title.includes('شقه') ||
      title.includes('بيت') || title.includes('سقف') || title.includes('ارضيه') ||
      title.includes('مرتبه') || title.includes('سباكه') || title.includes('حمام')) {
    return 'housing'
  }
  
  // Home Appliances
  if (title.includes('تلاجه') || title.includes('غساله') || title.includes('مروحه') ||
      title.includes('بوتاجاز') || title.includes('فريزر') || title.includes('كولدير') ||
      title.includes('شاشه') || title.includes('دولاب') || title.includes('سرير') ||
      title.includes('جهاز') || title.includes('أنبوبه') || title.includes('ماكينه') ||
      title.includes('خياطه') || title.includes('اوفر')) {
    return 'appliances'
  }
  
  // Emergency Relief
  if (title.includes('طوارئ') || title.includes('طارئ') || title.includes('حاله') ||
      title.includes('مساعده') || title.includes('دين') || title.includes('مشلول')) {
    return 'emergency'
  }
  
  // Livelihood & Business
  if (title.includes('مشروع') || title.includes('تجاره') || title.includes('عمل') ||
      title.includes('زراعه') || title.includes('طيور') || title.includes('مخبز') ||
      title.includes('خبز')) {
    return 'livelihood'
  }
  
  // Community & Social
  if (title.includes('مسجد') || title.includes('جامع') || title.includes('سجاجيد') ||
      title.includes('منبر') || title.includes('حلويات') || title.includes('مولد') ||
      title.includes('أكفان') || title.includes('لعب') || title.includes('أطفال') ||
      title.includes('چواكت') || title.includes('شتوي') || title.includes('لبس')) {
    return 'community'
  }
  
  // Basic Needs & Clothing
  if (title.includes('ملابس') || title.includes('ملابس') || title.includes('احتياجات') ||
      title.includes('خاصه') || title.includes('بطاطين') || title.includes('جواكيت')) {
    return 'basic_needs'
  }
  
  return 'other'
}

// Generate English title from Arabic
function generateEnglishTitle(titleAr) {
  // Simple translation mapping for common terms
  const translations = {
    'مريض': 'Patient',
    'دوا': 'Medicine',
    'أدويه': 'Medicines',
    'علاج': 'Treatment',
    'عمليه': 'Surgery',
    'كانسر': 'Cancer',
    'مستشفي': 'Hospital',
    'أشعه': 'X-ray',
    'سنان': 'Dental',
    'ضروس': 'Molars',
    'مدرسه': 'School',
    'مدارس': 'Schools',
    'دروس': 'Lessons',
    'مصاريف': 'Expenses',
    'ايجار': 'Rent',
    'إيجار': 'Rent',
    'شقه': 'Apartment',
    'بيت': 'House',
    'تلاجه': 'Refrigerator',
    'غساله': 'Washing Machine',
    'مروحه': 'Fan',
    'بوتاجاز': 'Stove',
    'فريزر': 'Freezer',
    'مساعده': 'Assistance',
    'دين': 'Debt',
    'مشروع': 'Project',
    'مسجد': 'Mosque',
    'جامع': 'Mosque',
    'أرمله': 'Widow',
    'أيتام': 'Orphans',
    'معاق': 'Disabled',
    'مطلقه': 'Divorced',
    'حامل': 'Pregnant',
    'شهريه': 'Monthly',
    'شهريات': 'Monthly Payments',
  }
  
  // Try to translate key terms
  let englishTitle = titleAr
  for (const [ar, en] of Object.entries(translations)) {
    if (englishTitle.includes(ar)) {
      englishTitle = englishTitle.replace(ar, en)
    }
  }
  
  // If no translation found, use a generic prefix
  if (englishTitle === titleAr) {
    englishTitle = `Case: ${titleAr.substring(0, 50)}`
  }
  
  return englishTitle.substring(0, 200)
}

// Generate English description from Arabic
function generateEnglishDescription(titleAr) {
  return `Support case: ${titleAr}`
}

// Main import function
async function importContributions() {
  try {
    console.log('📥 Starting import process...\n')
    console.log('💡 Note: Make sure you ran scripts/01-clear-all-data.js first!\n')
    
    // Step 2: Read CSV file
    const csvPath = join(__dirname, '..', 'docs', 'cases', 'contributions.csv')
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = parseCSVLine(lines[0])
    
    // Find column indices
    const idIdx = headers.indexOf('ID')
    const descIdx = headers.indexOf('Description')
    const contributorIdx = headers.indexOf('Contributor')
    const contributorIdIdx = headers.indexOf('ContributorID')
    const amountIdx = headers.indexOf('Amount')
    const monthIdx = headers.indexOf('Month')
    
    if (idIdx === -1 || descIdx === -1 || contributorIdx === -1 || 
        contributorIdIdx === -1 || amountIdx === -1) {
      throw new Error('Invalid CSV format: missing required columns (ID, Description, Contributor, ContributorID, Amount)')
    }
    
    console.log('📊 Parsing CSV data...\n')
    
    // Step 3: Collect unique contributors by ContributorID and group cases
    const contributorsMap = new Map() // ContributorID -> { userId, name }
    const casesMap = new Map() // case ID -> case data
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      // Skip empty rows
      if (!values[idIdx] || values[idIdx] === '' || values[idIdx].trim() === '') continue
      
      const caseId = values[idIdx].trim()
      const titleAr = values[descIdx]?.trim() || ''
      const contributor = values[contributorIdx]?.trim() || ''
      const contributorIdStr = values[contributorIdIdx]?.trim() || '0'
      const amountStr = values[amountIdx]?.replace(/[,"]/g, '').trim() || '0'
      const monthStr = values[monthIdx]?.trim() || ''
      
      // Parse ContributorID
      const contributorId = parseInt(contributorIdStr, 10)
      if (isNaN(contributorId)) {
        console.warn(`   ⚠️  Invalid ContributorID "${contributorIdStr}" for contributor "${contributor}", skipping`)
        continue
      }
      
      // Skip if ContributorID is negative (invalid)
      // ContributorID = 100 is for unknown contributors and should be processed
      if (contributorId < 0) {
        console.warn(`   ⚠️  Skipping contribution with invalid ContributorID ${contributorId} (${contributor})`)
        continue
      }
      
      // Handle ContributorID = 100 (unknown contributors)
      if (contributorId === 100) {
        // Use "Unknown Contributor" as name if not provided
        const unknownName = contributor && contributor.trim() !== '' ? contributor : 'Unknown Contributor'
        if (!contributorsMap.has(100)) {
          contributorsMap.set(100, {
            id: 100,
            name: unknownName,
            userId: null
          })
        }
        // Continue processing - don't skip
      }
      
      // Skip if no contributor name (except for ID=100 which we handle above)
      if (contributorId !== 100 && (!contributor || contributor === '' || contributor === '----------')) {
        console.warn(`   ⚠️  Skipping contribution with ContributorID ${contributorId} (no name)`)
        continue
      }
      
      const amount = parseFloat(amountStr)
      if (isNaN(amount) || amount <= 0) continue
      
      // Track unique contributors by ContributorID
      if (!contributorsMap.has(contributorId)) {
        contributorsMap.set(contributorId, {
          id: contributorId,
          name: contributor,
          userId: null // Will be filled with user ID later
        })
      } else {
        // Update name if we have a better one (longer, more descriptive)
        const existing = contributorsMap.get(contributorId)
        if (contributor.length > existing.name.length) {
          existing.name = contributor
        }
      }
      
      // Group contributions by case
      if (!casesMap.has(caseId)) {
        casesMap.set(caseId, {
          id: caseId,
          titleAr: titleAr,
          contributions: [],
          totalAmount: 0,
          month: monthStr,
        })
      }
      
      const caseData = casesMap.get(caseId)
      caseData.contributions.push({
        contributorId,
        contributor,
        amount,
        month: monthStr, // Store date for each contribution
      })
      caseData.totalAmount += amount
      
      // Update case month to earliest contribution date (or keep first if already set)
      if (monthStr && (!caseData.month || monthStr < caseData.month)) {
        caseData.month = monthStr
      }
    }
    
    console.log(`📋 Found ${casesMap.size} unique cases`)
    console.log(`👥 Found ${contributorsMap.size} unique contributors (by ContributorID)\n`)
    
    // Step 4: Verify donor role exists (required for trigger)
    console.log('🔍 Verifying donor role exists...\n')
    const { data: donorRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, name')
      .eq('name', 'donor')
      .eq('is_active', true)
      .single()
    
    if (roleError || !donorRole) {
      console.warn('   ⚠️  Donor role not found. Trigger may fail.')
      console.warn('   This might cause "Database error creating new user" errors.')
      console.warn('   Consider running: INSERT INTO admin_roles (name, display_name, level, is_system) VALUES (\'donor\', \'Donor\', 1, true) ON CONFLICT DO NOTHING;\n')
    } else {
      console.log(`   ✓ Donor role found (ID: ${donorRole.id})\n`)
    }
    
    // Note about trigger fix
    console.log('💡 Note: If you see "Database error creating new user" errors,')
    console.log('   apply the trigger fix manually via Supabase Dashboard:')
    console.log('   1. Go to Supabase Dashboard > SQL Editor')
    console.log('   2. Run: supabase/migrations/032_fix_donor_role_trigger.sql')
    console.log('   3. Then re-run this import script\n')
    
    // Step 5: Fetch all existing users once (with pagination)
    console.log('👤 Fetching existing users...\n')
    const allExistingUsers = await getAllAuthUsers()
    const usersByEmail = new Map()
    allExistingUsers.forEach(user => {
      usersByEmail.set(user.email, user)
    })
    console.log(`   ✓ Found ${allExistingUsers.length} existing users\n`)
    
    // Step 6: Create user accounts for all contributors
    console.log('👤 Creating user accounts for contributors...\n')
    
    let createdCount = 0
    let existingCount = 0
    let failedCount = 0
    const failedContributors = []
    
    for (const [contributorId, contributorData] of contributorsMap.entries()) {
      try {
        console.log(`   Creating account for ContributorID ${contributorId}: ${contributorData.name}`)
        const userId = await createContributorUser(contributorId, contributorData.name, usersByEmail)
        contributorData.userId = userId
        createdCount++
        
        // Add delay between user creations to avoid rate limits
        // Small delay for successful creations
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        failedCount++
        failedContributors.push({ id: contributorId, name: contributorData.name, error: error.message })
        console.error(`   ❌ Failed to create user for ContributorID ${contributorId}:`, error.message)
        
        // Longer delay after failures
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Continue with other users
      }
    }
    
    console.log(`\n✅ Created ${createdCount} new user accounts`)
    console.log(`   (${existingCount} already existed)`)
    if (failedCount > 0) {
      console.log(`   ⚠️  Failed to create ${failedCount} user accounts`)
      console.log(`\n   Failed ContributorIDs:`)
      failedContributors.forEach(f => {
        console.log(`     - ID ${f.id}: ${f.name} (${f.error})`)
      })
      console.log(`\n   ⚠️  Contributions for these ContributorIDs will be skipped\n`)
    } else {
      console.log()
    }
    
    // Step 6: Get case categories
    console.log('📂 Fetching case categories...\n')
    const { data: categories, error: catError } = await supabase
      .from('case_categories')
      .select('id, name')
      .eq('is_active', true)
    
    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`)
    }
    
    const categoryMap = new Map()
    categories.forEach(cat => {
      const nameLower = cat.name.toLowerCase()
      if (nameLower.includes('medical')) categoryMap.set('medical', cat.id)
      else if (nameLower.includes('educational')) categoryMap.set('educational', cat.id)
      else if (nameLower.includes('housing')) categoryMap.set('housing', cat.id)
      else if (nameLower.includes('appliance')) categoryMap.set('appliances', cat.id)
      else if (nameLower.includes('emergency')) categoryMap.set('emergency', cat.id)
      else if (nameLower.includes('livelihood')) categoryMap.set('livelihood', cat.id)
      else if (nameLower.includes('community')) categoryMap.set('community', cat.id)
      else if (nameLower.includes('basic')) categoryMap.set('basic_needs', cat.id)
      else if (nameLower.includes('other')) categoryMap.set('other', cat.id)
    })
    
    // Get default category (other) if needed
    const defaultCategoryId = categoryMap.get('other') || categories[0]?.id
    
    // Step 7: Get payment method (cash as default)
    console.log('💳 Fetching payment methods...\n')
    const { data: paymentMethods, error: pmError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('code', 'cash')
      .eq('is_active', true)
      .single()
    
    if (pmError || !paymentMethods) {
      // Try to get any active payment method
      const { data: anyPM } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()
      
      if (!anyPM) {
        throw new Error('No payment methods found in database')
      }
      var paymentMethodId = anyPM.id
    } else {
      var paymentMethodId = paymentMethods.id
    }
    
    // Step 8: Get admin user for created_by field
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
    
    const adminUserId = adminUsers?.[0]?.id || Array.from(contributorsMap.values())[0]?.userId
    
    // Step 9: Create cases
    console.log('📝 Creating cases...\n')
    
    const caseIdMap = new Map() // old case ID -> new UUID
    const casesToInsert = []
    
    for (const [oldCaseId, caseData] of casesMap.entries()) {
      const categoryKey = categorizeCase(caseData.titleAr)
      const categoryId = categoryMap.get(categoryKey) || defaultCategoryId
      
      const titleEn = generateEnglishTitle(caseData.titleAr)
      const descriptionEn = generateEnglishDescription(caseData.titleAr)
      
      casesToInsert.push({
        title_en: titleEn,
        title_ar: caseData.titleAr,
        description_en: descriptionEn,
        description_ar: caseData.titleAr,
        type: 'one-time',
        category_id: categoryId,
        priority: 'medium',
        target_amount: caseData.totalAmount.toString(),
        current_amount: '0', // Will be updated after contributions are created
        status: 'published',
        created_by: adminUserId,
        created_at: caseData.month ? dateStrToISO(caseData.month) || new Date().toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    
    const { data: insertedCases, error: casesError } = await supabase
      .from('cases')
      .insert(casesToInsert)
      .select('id, title_ar')
    
    if (casesError) {
      throw new Error(`Failed to create cases: ${casesError.message}`)
    }
    
    // Map old case IDs to new UUIDs
    let caseIndex = 0
    for (const [oldCaseId, _] of casesMap.entries()) {
      if (caseIndex < insertedCases.length) {
        caseIdMap.set(oldCaseId, insertedCases[caseIndex].id)
        caseIndex++
      }
    }
    
    console.log(`✅ Created ${insertedCases.length} cases\n`)
    
    // Step 10: Create contributions
    console.log('💰 Creating contributions...\n')
    
    const contributionsToInsert = []
    
    for (const [oldCaseId, caseData] of casesMap.entries()) {
      const newCaseId = caseIdMap.get(oldCaseId)
      if (!newCaseId) continue
      
      for (const contrib of caseData.contributions) {
        const contributorData = contributorsMap.get(contrib.contributorId)
        if (!contributorData || !contributorData.userId) {
          console.warn(`   ⚠️  No user ID found for ContributorID ${contrib.contributorId} (${contrib.contributor})`)
          continue
        }
        
        // Use individual contribution date, fallback to case date, then current date
        const contribDate = contrib.month 
          ? dateStrToISO(contrib.month) 
          : (caseData.month ? dateStrToISO(caseData.month) : null)
        
        contributionsToInsert.push({
          type: 'donation',
          amount: contrib.amount.toString(),
          payment_method_id: paymentMethodId,
          status: 'approved',
          anonymous: contrib.contributorId === 100, // Anonymous for unknown contributors (ID=100)
          donor_id: contributorData.userId,
          case_id: newCaseId,
          created_at: contribDate || new Date().toISOString(),
          updated_at: contribDate || new Date().toISOString(),
        })
      }
    }
    
    // Insert contributions in batches
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < contributionsToInsert.length; i += batchSize) {
      const batch = contributionsToInsert.slice(i, i + batchSize)
      const { error: contribError } = await supabase
        .from('contributions')
        .insert(batch)
      
      if (contribError) {
        console.error(`   ❌ Error inserting batch ${i / batchSize + 1}:`, contribError.message)
      } else {
        insertedCount += batch.length
        console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${insertedCount}/${contributionsToInsert.length} contributions)`)
      }
    }
    
    console.log(`\n✅ Created ${insertedCount} contributions\n`)
    
    // Step 11: Create approval statuses for all contributions
    console.log('✅ Creating approval statuses...\n')
    
    const { data: allContributions } = await supabase
      .from('contributions')
      .select('id')
      .eq('status', 'approved')
    
    if (allContributions && allContributions.length > 0) {
      const approvalStatuses = allContributions.map(contrib => ({
        contribution_id: contrib.id,
        status: 'approved',
        admin_id: adminUserId,
      }))
      
      // Insert in batches
      for (let i = 0; i < approvalStatuses.length; i += batchSize) {
        const batch = approvalStatuses.slice(i, i + batchSize)
        const { error: approvalError } = await supabase
          .from('contribution_approval_status')
          .insert(batch)
        
        if (approvalError) {
          console.error(`   ⚠️  Error inserting approval batch ${Math.floor(i / batchSize) + 1}:`, approvalError.message)
        }
      }
      
      console.log(`✅ Created ${approvalStatuses.length} approval statuses\n`)
    }
    
    // Step 11.5: Create notifications for contributions
    console.log('📬 Creating notifications...\n')
    
    // Get admin users for pending notifications
    const { data: adminRoles } = await supabase
      .from('admin_user_roles')
      .select('user_id, admin_roles!inner(name)')
      .eq('is_active', true)
      .in('admin_roles.name', ['admin', 'super_admin'])
    
    const adminUserIds = [...new Set(adminRoles?.map(r => r.user_id) || [])]
    
    // Fetch all contributions with case data for notifications
    const { data: contribsWithCases } = await supabase
      .from('contributions')
      .select(`
        id,
        amount,
        donor_id,
        case_id,
        created_at,
        cases (
          title_en,
          title_ar
        )
      `)
      .eq('status', 'approved')
    
    if (contribsWithCases && contribsWithCases.length > 0) {
      const notificationsToInsert = []
      
      for (const contrib of contribsWithCases) {
        const amount = parseFloat(contrib.amount || '0')
        const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
        const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
        
        // Create admin notifications (contribution_pending)
        for (const adminId of adminUserIds) {
          notificationsToInsert.push({
            type: 'contribution_pending',
            recipient_id: adminId,
            title: 'New Contribution Submitted',
            message: `A new contribution of ${amount.toLocaleString()} EGP has been submitted for case: ${caseTitle}`,
            data: {
              contribution_id: contrib.id,
              case_id: contrib.case_id,
              amount: amount
            },
            read: false,
            created_at: contrib.created_at
          })
        }
        
        // Create donor notification (contribution_approved)
        if (contrib.donor_id) {
          notificationsToInsert.push({
            type: 'contribution_approved',
            recipient_id: contrib.donor_id,
            title: 'Contribution Approved',
            message: `Your contribution of ${amount.toLocaleString()} EGP for "${caseTitle}" has been approved. Thank you for your generosity!`,
            data: {
              contribution_id: contrib.id,
              amount: amount,
              case_title: caseTitle
            },
            read: false,
            created_at: contrib.created_at
          })
        }
      }
      
      // Insert notifications in batches
      let notifInsertedCount = 0
      for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
        const batch = notificationsToInsert.slice(i, i + batchSize)
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(batch)
        
        if (notifError) {
          console.error(`   ⚠️  Error inserting notification batch ${Math.floor(i / batchSize) + 1}:`, notifError.message)
        } else {
          notifInsertedCount += batch.length
        }
      }
      
      console.log(`✅ Created ${notifInsertedCount} notifications\n`)
    }
    
    // Step 12: Update case amounts
    console.log('📊 Updating case amounts...\n')
    
    for (const [oldCaseId, caseData] of casesMap.entries()) {
      const newCaseId = caseIdMap.get(oldCaseId)
      if (!newCaseId) continue
      
      const { error: updateError } = await supabase
        .from('cases')
        .update({
          current_amount: caseData.totalAmount.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', newCaseId)
      
      if (updateError) {
        console.error(`   ⚠️  Error updating case ${newCaseId}:`, updateError.message)
      }
    }
    
    console.log('✅ Updated case amounts\n')
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Created ${createdCount} user accounts (by ContributorID)`)
    console.log(`✅ Created ${insertedCases.length} cases`)
    console.log(`✅ Created ${insertedCount} contributions`)
    console.log(`✅ Created ${allContributions?.length || 0} approval statuses`)
    console.log('\n💡 All contributors can now:')
    console.log('   - Login using their email (format: name<ContributorID>@contributor.meenma3ana.local)')
    console.log('   - Reset their password using the "Forgot Password" feature')
    console.log('   - Admin can modify their profiles in the admin panel')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the import
importContributions()
  .then(() => {
    console.log('✨ Import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Import failed:', error)
    process.exit(1)
  })
