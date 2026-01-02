#!/usr/bin/env node

/**
 * Add Batch Upload Menu Item and Permission
 * 
 * This script:
 * 1. Creates a permission for batch case upload (super_admin only)
 * 2. Assigns the permission to super_admin role
 * 3. Creates a menu item for batch upload
 * 
 * Usage: node scripts/admin/73-add-batch-upload-menu.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addBatchUploadMenu() {
  try {
    console.log('🚀 Adding Batch Upload Menu Item and Permission...\n')

    // Step 1: Get super_admin role
    console.log('📋 Step 1: Finding super_admin role...')
    const { data: superAdminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, name')
      .eq('name', 'super_admin')
      .single()

    if (roleError || !superAdminRole) {
      console.error('❌ Error finding super_admin role:', roleError)
      console.error('   Make sure the admin system is set up first')
      process.exit(1)
    }

    console.log(`✅ Found super_admin role: ${superAdminRole.id}\n`)

    // Step 2: Check if permission already exists
    console.log('📋 Step 2: Checking for existing permission...')
    const { data: existingPermission } = await supabase
      .from('admin_permissions')
      .select('id, name')
      .eq('name', 'cases:batch_upload')
      .single()

    let permissionId

    if (existingPermission) {
      console.log(`✅ Permission already exists: ${existingPermission.id}`)
      permissionId = existingPermission.id
    } else {
      // Step 3: Create permission
      console.log('📋 Step 3: Creating permission...')
      const { data: newPermission, error: permError } = await supabase
        .from('admin_permissions')
        .insert({
          name: 'cases:batch_upload',
          display_name: 'Batch Upload Cases',
          display_name_ar: 'رفع الحالات بالجملة',
          description: 'Permission to upload cases and contributions in bulk via CSV',
          description_ar: 'صلاحية رفع الحالات والمساهمات بالجملة عبر ملف CSV',
          resource: 'cases',
          action: 'batch_upload',
          is_system: false,
          is_active: true
        })
        .select()
        .single()

      if (permError || !newPermission) {
        console.error('❌ Error creating permission:', permError)
        process.exit(1)
      }

      console.log(`✅ Created permission: ${newPermission.id}`)
      permissionId = newPermission.id
    }

    // Step 4: Assign permission to super_admin role
    console.log('\n📋 Step 4: Assigning permission to super_admin role...')
    
    // Check if permission is already assigned
    const { data: existingRolePerm } = await supabase
      .from('admin_role_permissions')
      .select('id')
      .eq('role_id', superAdminRole.id)
      .eq('permission_id', permissionId)
      .single()

    if (existingRolePerm) {
      console.log('✅ Permission already assigned to super_admin')
    } else {
      const { error: rolePermError } = await supabase
        .from('admin_role_permissions')
        .insert({
          role_id: superAdminRole.id,
          permission_id: permissionId
        })

      if (rolePermError) {
        console.error('❌ Error assigning permission to role:', rolePermError)
        process.exit(1)
      }

      console.log('✅ Assigned permission to super_admin role')
    }

    // Step 5: Check if menu item already exists
    console.log('\n📋 Step 5: Checking for existing menu item...')
    const { data: existingMenuItem } = await supabase
      .from('admin_menu_items')
      .select('id, label, href')
      .eq('href', '/case-management/batch-upload')
      .single()

    if (existingMenuItem) {
      console.log(`✅ Menu item already exists: ${existingMenuItem.label}`)
      console.log('   Updating permission...')
      
      // Update existing menu item to use the permission
      const { error: updateError } = await supabase
        .from('admin_menu_items')
        .update({ permission_id: permissionId })
        .eq('id', existingMenuItem.id)

      if (updateError) {
        console.error('❌ Error updating menu item:', updateError)
        process.exit(1)
      }

      console.log('✅ Updated menu item with permission')
    } else {
      // Step 6: Find parent menu item (Case Management)
      console.log('\n📋 Step 6: Finding Case Management parent menu...')
      const { data: caseManagementMenu } = await supabase
        .from('admin_menu_items')
        .select('id, label, sort_order')
        .eq('href', '/case-management')
        .single()

      let parentId = null
      let sortOrder = 100

      if (caseManagementMenu) {
        parentId = caseManagementMenu.id
        // Get max sort_order of children
        const { data: siblings } = await supabase
          .from('admin_menu_items')
          .select('sort_order')
          .eq('parent_id', parentId)
          .order('sort_order', { ascending: false })
          .limit(1)

        if (siblings && siblings.length > 0) {
          sortOrder = (siblings[0].sort_order || 0) + 1
        }
        console.log(`✅ Found parent menu: ${caseManagementMenu.label}`)
      } else {
        console.log('⚠️  Case Management menu not found, creating as top-level item')
      }

      // Step 7: Create menu item
      console.log('\n📋 Step 7: Creating menu item...')
      const { data: newMenuItem, error: menuError } = await supabase
        .from('admin_menu_items')
        .insert({
          label: 'Batch Upload',
          label_ar: 'رفع بالجملة',
          href: '/case-management/batch-upload',
          icon: 'Upload',
          description: 'Upload cases and contributions in bulk via CSV',
          description_ar: 'رفع الحالات والمساهمات بالجملة عبر ملف CSV',
          permission_id: permissionId,
          parent_id: parentId,
          sort_order: sortOrder,
          is_active: true
        })
        .select()
        .single()

      if (menuError || !newMenuItem) {
        console.error('❌ Error creating menu item:', menuError)
        process.exit(1)
      }

      console.log(`✅ Created menu item: ${newMenuItem.label}`)
      console.log(`   - ID: ${newMenuItem.id}`)
      console.log(`   - Href: ${newMenuItem.href}`)
      console.log(`   - Permission: ${permissionId}`)
    }

    console.log('\n✅ Batch upload menu setup complete!')
    console.log('\n📝 Summary:')
    console.log('   - Permission: cases:batch_upload')
    console.log('   - Assigned to: super_admin role')
    console.log('   - Menu item: /case-management/batch-upload')
    console.log('\n💡 Only users with super_admin role will see this menu item.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
addBatchUploadMenu()

