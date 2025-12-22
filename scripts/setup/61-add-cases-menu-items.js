#!/usr/bin/env node

/**
 * Script to add Cases and Admin Cases menu items with their permissions
 * 
 * This script ensures that:
 * 1. Cases menu item exists in main navigation (/cases) with cases:view permission
 * 2. Admin Cases menu item exists under Administration (/admin/cases) with cases:manage permission
 * 
 * Usage: node scripts/61-add-cases-menu-items.js
 * 
 * Note: This script uses the Supabase service role key to bypass RLS.
 * Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const envLocalPath = join(__dirname, '..', '.env.local')
const envPath = join(__dirname, '..', '.env')

try {
  if (readFileSync(envLocalPath, 'utf8')) {
    dotenv.config({ path: envLocalPath })
  }
} catch (e) {
  // .env.local doesn't exist, that's okay
}

try {
  if (readFileSync(envPath, 'utf8')) {
    dotenv.config({ path: envPath })
  }
} catch (e) {
  // .env doesn't exist, that's okay
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Please check your .env.local or .env file')
  process.exit(1)
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function getPermissionId(permissionName) {
  const { data, error } = await supabase
    .from('admin_permissions')
    .select('id')
    .eq('name', permissionName)
    .single()

  if (error) {
    console.error(`❌ Error fetching permission ${permissionName}:`, error.message)
    return null
  }

  return data?.id || null
}

async function getMenuItem(href, parentId = null) {
  const query = supabase
    .from('admin_menu_items')
    .select('id')
    .eq('href', href)

  if (parentId === null) {
    query.is('parent_id', null)
  } else {
    query.eq('parent_id', parentId)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`❌ Error checking menu item ${href}:`, error.message)
    return null
  }

  return data?.id || null
}

async function getAdminParentId() {
  const { data, error } = await supabase
    .from('admin_menu_items')
    .select('id')
    .eq('href', '/admin')
    .is('parent_id', null)
    .single()

  if (error) {
    console.error('❌ Error fetching admin parent menu item:', error.message)
    return null
  }

  return data?.id || null
}

async function createOrUpdateMenuItem(menuItem) {
  const { href, parent_id } = menuItem

  // Check if menu item already exists
  const existingId = await getMenuItem(href, parent_id)

  if (existingId) {
    // Update existing menu item
    const { data, error } = await supabase
      .from('admin_menu_items')
      .update(menuItem)
      .eq('id', existingId)
      .select()
      .single()

    if (error) {
      console.error(`❌ Error updating menu item ${href}:`, error.message)
      return false
    }

    console.log(`✅ Updated menu item: ${menuItem.label} (${href})`)
    return true
  } else {
    // Create new menu item
    const { data, error } = await supabase
      .from('admin_menu_items')
      .insert(menuItem)
      .select()
      .single()

    if (error) {
      console.error(`❌ Error creating menu item ${href}:`, error.message)
      return false
    }

    console.log(`✅ Created menu item: ${menuItem.label} (${href})`)
    return true
  }
}

async function main() {
  console.log('🚀 Starting Cases menu items setup...\n')

  // Get permission IDs
  console.log('📋 Fetching permissions...')
  const casesViewPermissionId = await getPermissionId('cases:view')
  const casesManagePermissionId = await getPermissionId('cases:manage')

  if (!casesViewPermissionId) {
    console.error('❌ Error: cases:view permission not found')
    console.error('   Please ensure the permission exists in admin_permissions table')
    process.exit(1)
  }
  if (!casesManagePermissionId) {
    console.error('❌ Error: cases:manage permission not found')
    console.error('   Please ensure the permission exists in admin_permissions table')
    process.exit(1)
  }

  console.log('✅ All required permissions found\n')

  // Get admin parent menu item ID
  const adminParentId = await getAdminParentId()
  if (!adminParentId) {
    console.warn('⚠️  Warning: Admin parent menu item not found. Admin Cases menu item will not be created.')
  }

  // Define menu items to create/update
  const menuItems = [
    // Main navigation: Cases (Browse cases)
    {
      label: 'Cases',
      label_ar: 'الحالات',
      href: '/cases',
      icon: 'Heart',
      description: 'Browse donation cases',
      sort_order: 2,
      permission_id: casesViewPermissionId,
      parent_id: null
    }
  ]

  // Add Admin Cases menu item if admin parent exists
  if (adminParentId) {
    menuItems.push({
      label: 'Cases',
      label_ar: 'الحالات',
      href: '/admin/cases',
      icon: 'Heart',
      description: 'Manage cases',
      sort_order: 2,
      permission_id: casesManagePermissionId,
      parent_id: adminParentId
    })
  }

  // Create or update menu items
  console.log('📝 Creating/updating menu items...\n')
  let successCount = 0
  let failCount = 0

  for (const menuItem of menuItems) {
    const success = await createOrUpdateMenuItem(menuItem)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   ✅ Successfully processed: ${successCount} menu item(s)`)
  if (failCount > 0) {
    console.log(`   ❌ Failed: ${failCount} menu item(s)`)
  }
  console.log('='.repeat(50))

  if (failCount === 0) {
    console.log('\n✅ All menu items have been successfully added/updated!')
    process.exit(0)
  } else {
    console.log('\n❌ Some menu items failed to be created/updated')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

