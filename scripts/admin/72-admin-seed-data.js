import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function seedData() {
  try {
    console.log('🌱 Seeding database with initial data...')

    // First, let's create some case categories
    console.log('📂 Creating case categories...')
    const categories = [
      { name: 'Medical', description: 'Medical and healthcare related cases', icon: '🏥', color: '#ef4444' },
      { name: 'Education', description: 'Education and learning related cases', icon: '📚', color: '#3b82f6' },
      { name: 'Housing', description: 'Housing and shelter related cases', icon: '🏠', color: '#10b981' },
      { name: 'Food', description: 'Food and nutrition related cases', icon: '🍽️', color: '#f59e0b' },
      { name: 'Emergency', description: 'Emergency and urgent cases', icon: '🚨', color: '#dc2626' },
      { name: 'Other', description: 'Other types of cases', icon: '💝', color: '#8b5cf6' }
    ]

    for (const category of categories) {
      // Check if category already exists
      const { data: existingCategory } = await supabase
        .from('case_categories')
        .select('id')
        .eq('name', category.name)
        .single()
      
      if (!existingCategory) {
        const { error } = await supabase
          .from('case_categories')
          .insert(category)
        
        if (error) {
          console.error(`Error creating category ${category.name}:`, error)
        } else {
          console.log(`✅ Created category: ${category.name}`)
        }
      } else {
        console.log(`✅ Category already exists: ${category.name}`)
      }
    }

    // Get the first user (or create one if needed)
    console.log('👤 Using existing user ID for cases...')
    const testUserId = 'f62f828c-c9c8-416c-bef2-1a64a693dceb' // Existing user ID
    console.log('✅ Using existing user ID')

    // Get category IDs
    const { data: categoryData } = await supabase
      .from('case_categories')
      .select('id, name')

    const categoryMap = categoryData?.reduce((acc, cat) => {
      acc[cat.name] = cat.id
      return acc
    }, {})

    console.log('📋 Category mapping:', categoryMap)

    // Create some sample cases
    console.log('📋 Creating sample cases...')
    const sampleCases = [
      {
        title: 'Help Ahmed with Medical Treatment',
        description: 'Ahmed needs urgent medical treatment for a serious condition. His family cannot afford the medical expenses.',
        type: 'one-time',
        category_id: categoryMap?.['Medical'],
        priority: 'high',
        location: 'Cairo, Egypt',
        beneficiary_name: 'Ahmed Hassan',
        beneficiary_contact: '+20 123 456 7890',
        target_amount: 5000,
        current_amount: 0,
        status: 'published',
        created_by: testUserId,
        duration: 30
      },
      {
        title: 'Support Sarah\'s Education',
        description: 'Sarah is a bright student who needs financial support to continue her university education.',
        type: 'recurring',
        category_id: categoryMap?.['Education'],
        priority: 'medium',
        location: 'Alexandria, Egypt',
        beneficiary_name: 'Sarah Mohamed',
        beneficiary_contact: '+20 987 654 3210',
        target_amount: 3000,
        current_amount: 0,
        status: 'published',
        created_by: testUserId,
        frequency: 'monthly',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Emergency Food Aid for Family',
        description: 'A family of 6 needs immediate food assistance due to recent job loss.',
        type: 'one-time',
        category_id: categoryMap?.['Food'],
        priority: 'high',
        location: 'Giza, Egypt',
        beneficiary_name: 'Fatima Ali',
        beneficiary_contact: '+20 555 123 4567',
        target_amount: 800,
        current_amount: 0,
        status: 'published',
        created_by: testUserId,
        duration: 7
      },
      {
        title: 'Housing Support for Refugees',
        description: 'Supporting refugee families with housing and basic necessities.',
        type: 'recurring',
        category_id: categoryMap?.['Housing'],
        priority: 'medium',
        location: 'Port Said, Egypt',
        beneficiary_name: 'Refugee Support Group',
        beneficiary_contact: '+20 777 888 9999',
        target_amount: 2000,
        current_amount: 0,
        status: 'published',
        created_by: testUserId,
        frequency: 'quarterly',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    for (const caseData of sampleCases) {
      const { error } = await supabase
        .from('cases')
        .insert(caseData)
      
      if (error) {
        console.error(`Error creating case "${caseData.title}":`, error)
      } else {
        console.log(`✅ Created case: ${caseData.title}`)
      }
    }

    console.log('🎉 Database seeding completed successfully!')
    console.log('📊 You can now test the application with sample data.')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
  }
}

seedData() 