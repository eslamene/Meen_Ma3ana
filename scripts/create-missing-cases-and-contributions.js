/**
 * Create Missing Cases and Import Remaining Skipped Contributions
 * 
 * Creates the 2 missing cases and imports the remaining 6 contributions
 * that were skipped because ContributorID = 0.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper functions
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null
  const parts = dateStr.trim().split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  return null
}

function dateStrToISO(dateStr) {
  const parsed = parseDate(dateStr)
  return parsed ? parsed.toISOString() : null
}

function categorizeCase(titleAr) {
  if (!titleAr) return 'other'
  const title = titleAr.toLowerCase()
  
  if (title.includes('مريض') || title.includes('دوا') || title.includes('علاج') || 
      title.includes('مستشفي') || title.includes('سكر') || title.includes('ms')) {
    return 'medical'
  }
  if (title.includes('مدرسه') || title.includes('مدارس') || title.includes('تعليم')) {
    return 'educational'
  }
  if (title.includes('ايجار') || title.includes('بيت') || title.includes('شقه')) {
    return 'housing'
  }
  return 'other'
}

function generateEnglishTitle(titleAr) {
  // Simple transliteration for common words
  const translations = {
    'بنت': 'Daughter',
    'ام': 'Mother',
    'مدرسه': 'School',
    'مريض': 'Patient',
    'الراجل': 'Man',
  }
  
  let titleEn = titleAr
  Object.entries(translations).forEach(([ar, en]) => {
    titleEn = titleEn.replace(new RegExp(ar, 'gi'), en)
  })
  
  return titleEn || 'Case'
}

async function createMissingCasesAndContributions() {
  console.log('📥 Creating missing cases and importing remaining contributions...\n')
  
  // Step 1: Get or create unknown contributor user
  console.log('👤 Step 1: Getting unknown contributor user...')
  const unknownEmail = 'unknown@contributor.meenma3ana.local'
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let unknownUserId = existingUsers?.users?.find(u => u.email === unknownEmail)?.id
  
  if (!unknownUserId) {
    console.error('❌ Unknown contributor user not found. Run import-skipped-contributions.js first.')
    process.exit(1)
  }
  console.log(`   ✓ Found unknown contributor: ${unknownUserId}\n`)
  
  // Step 2: Get categories
  console.log('📂 Step 2: Getting case categories...')
  const { data: categories } = await supabase
    .from('case_categories')
    .select('id, name')
    .eq('is_active', true)
  
  const categoryMap = new Map()
  categories?.forEach(cat => {
    const nameLower = cat.name.toLowerCase()
    if (nameLower.includes('medical')) categoryMap.set('medical', cat.id)
    else if (nameLower.includes('educational')) categoryMap.set('educational', cat.id)
    else if (nameLower.includes('housing')) categoryMap.set('housing', cat.id)
    else if (nameLower.includes('other')) categoryMap.set('other', cat.id)
  })
  
  const defaultCategoryId = categoryMap.get('other') || categories?.[0]?.id
  console.log(`   ✓ Found ${categories?.length || 0} categories\n`)
  
  // Step 3: Get payment method
  console.log('💳 Step 3: Getting payment method...')
  const { data: paymentMethod } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('code', 'cash')
    .eq('is_active', true)
    .single()
  
  if (!paymentMethod) {
    const { data: anyPM } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (!anyPM) {
      console.error('❌ No payment methods found')
      process.exit(1)
    }
    var paymentMethodId = anyPM.id
  } else {
    var paymentMethodId = paymentMethod.id
  }
  console.log(`   ✓ Payment method ID: ${paymentMethodId}\n`)
  
  // Step 4: Get admin user for created_by
  const { data: adminUsers } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
  
  const adminUserId = adminUsers?.[0]?.id || unknownUserId
  
  // Step 5: Define missing cases and their contributions
  const missingCases = [
    {
      caseId: '85',
      titleAr: 'بنت ام فاروق السنان',
      contributions: [
        { amount: 25000, month: '01/09/2025' },
        { amount: 7000, month: '01/09/2025' }
      ]
    },
    {
      caseId: '60',
      titleAr: 'مدرسه الراجل مريض ms',
      contributions: [
        { amount: 1000, month: '01/09/2025' },
        { amount: 7000, month: '01/09/2025' },
        { amount: 3000, month: '01/09/2025' },
        { amount: 1000, month: '01/09/2025' }
      ]
    }
  ]
  
  console.log('📝 Step 4: Creating missing cases...\n')
  
  const casesToInsert = []
  for (const caseData of missingCases) {
    const categoryKey = categorizeCase(caseData.titleAr)
    const categoryId = categoryMap.get(categoryKey) || defaultCategoryId
    const totalAmount = caseData.contributions.reduce((sum, c) => sum + c.amount, 0)
    const earliestDate = caseData.contributions[0]?.month || '01/09/2025'
    
    const titleEn = generateEnglishTitle(caseData.titleAr)
    
    casesToInsert.push({
      title_en: titleEn,
      title_ar: caseData.titleAr,
      description_en: titleEn,
      description_ar: caseData.titleAr,
      type: 'one-time',
      category_id: categoryId,
      priority: 'medium',
      target_amount: totalAmount.toString(),
      current_amount: '0', // Will be updated after contributions
      status: 'published',
      created_by: adminUserId,
      created_at: dateStrToISO(earliestDate) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      originalCaseData: caseData, // Store for later use
    })
  }
  
  // Insert cases
  const { data: insertedCases, error: casesError } = await supabase
    .from('cases')
    .insert(casesToInsert.map(({ originalCaseData, ...caseData }) => caseData))
    .select('id, title_ar')
  
  if (casesError) {
    console.error('❌ Error creating cases:', casesError.message)
    process.exit(1)
  }
  
  console.log(`✅ Created ${insertedCases.length} cases:\n`)
  insertedCases.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.title_ar} (ID: ${c.id})`)
  })
  console.log()
  
  // Step 6: Create contributions for these cases
  console.log('💰 Step 5: Creating contributions...\n')
  
  const contributionsToInsert = []
  for (let i = 0; i < insertedCases.length; i++) {
    const newCase = insertedCases[i]
    const originalCase = missingCases[i]
    
    for (const contrib of originalCase.contributions) {
      const contribDate = contrib.month ? dateStrToISO(contrib.month) : null
      
      contributionsToInsert.push({
        type: 'donation',
        amount: contrib.amount.toString(),
        payment_method_id: paymentMethodId,
        status: 'approved',
        anonymous: true,
        donor_id: unknownUserId,
        case_id: newCase.id,
        created_at: contribDate || new Date().toISOString(),
        updated_at: contribDate || new Date().toISOString(),
      })
    }
  }
  
  const { data: insertedContribs, error: contribsError } = await supabase
    .from('contributions')
    .insert(contributionsToInsert)
    .select('id, amount')
  
  if (contribsError) {
    console.error('❌ Error creating contributions:', contribsError.message)
    process.exit(1)
  }
  
  console.log(`✅ Created ${insertedContribs.length} contributions\n`)
  
  // Step 7: Create approval statuses
  console.log('✅ Step 6: Creating approval statuses...')
  const approvalStatuses = insertedContribs.map(contrib => ({
    contribution_id: contrib.id,
    status: 'approved',
    admin_id: adminUserId,
  }))
  
  const { error: approvalError } = await supabase
    .from('contribution_approval_status')
    .insert(approvalStatuses)
  
  if (approvalError) {
    console.error('⚠️  Error creating approval statuses:', approvalError.message)
  } else {
    console.log(`   ✓ Created ${approvalStatuses.length} approval statuses\n`)
  }
  
  // Step 7.5: Create notifications
  console.log('📬 Step 6.5: Creating notifications...')
  
  // Get admin users
  const { data: adminRoles } = await supabase
    .from('admin_user_roles')
    .select('user_id, admin_roles!inner(name)')
    .eq('is_active', true)
    .in('admin_roles.name', ['admin', 'super_admin'])
  
  const adminUserIds = [...new Set(adminRoles?.map(r => r.user_id) || [])]
  
  // Fetch contributions with case data
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
    .in('id', insertedContribs.map(c => c.id))
  
  if (contribsWithCases && contribsWithCases.length > 0) {
    const notificationsToInsert = []
    
    for (const contrib of contribsWithCases) {
      const amount = parseFloat(contrib.amount || '0')
      const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
      const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
      
      // Admin notifications
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
      
      // Donor notification (for unknown contributor)
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
    
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationsToInsert)
    
    if (notifError) {
      console.error('⚠️  Error creating notifications:', notifError.message)
    } else {
      console.log(`   ✓ Created ${notificationsToInsert.length} notifications\n`)
    }
  }
  
  // Step 8: Update case amounts
  console.log('📊 Step 7: Updating case amounts...')
  for (let i = 0; i < insertedCases.length; i++) {
    const newCase = insertedCases[i]
    const originalCase = missingCases[i]
    const totalAmount = originalCase.contributions.reduce((sum, c) => sum + c.amount, 0)
    
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        current_amount: totalAmount.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', newCase.id)
    
    if (updateError) {
      console.error(`   ⚠️  Error updating case ${newCase.id}:`, updateError.message)
    }
  }
  
  console.log('   ✓ Updated case amounts\n')
  
  // Summary
  const totalAmount = contributionsToInsert.reduce((sum, c) => sum + parseFloat(c.amount), 0)
  
  console.log('='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Created ${insertedCases.length} cases`)
  console.log(`✅ Created ${insertedContribs.length} contributions`)
  console.log(`💰 Total amount: ${totalAmount.toLocaleString()} EGP`)
  console.log(`👤 Assigned to: Unknown Contributor (${unknownUserId})`)
  console.log('='.repeat(60) + '\n')
}

createMissingCasesAndContributions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

