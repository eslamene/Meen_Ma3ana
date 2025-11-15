/**
 * Admin Category Detection Rules API Route
 * GET /api/admin/category-detection-rules - Get all category detection rules
 * POST /api/admin/category-detection-rules - Create a new rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'
import { db } from '@/lib/db'
import { categoryDetectionRules, caseCategories } from '@/drizzle/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { clearCategoryRulesCache } from '@/lib/utils/category-detection'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const hasAdminRole = await adminService.hasRole(user.id, 'admin') || 
                         await adminService.hasRole(user.id, 'super_admin')

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    const whereConditions: any[] = []

    if (categoryId && categoryId !== 'all') {
      whereConditions.push(eq(categoryDetectionRules.category_id, categoryId))
    }

    if (activeOnly) {
      whereConditions.push(eq(categoryDetectionRules.is_active, true))
    }

    const rules = await db
      .select({
        id: categoryDetectionRules.id,
        category_id: categoryDetectionRules.category_id,
        keyword: categoryDetectionRules.keyword,
        is_active: categoryDetectionRules.is_active,
        priority: categoryDetectionRules.priority,
        created_at: categoryDetectionRules.created_at,
        updated_at: categoryDetectionRules.updated_at,
        created_by: categoryDetectionRules.created_by,
        updated_by: categoryDetectionRules.updated_by,
        category: {
          id: caseCategories.id,
          name: caseCategories.name,
          icon: caseCategories.icon,
          color: caseCategories.color,
        },
      })
      .from(categoryDetectionRules)
      .innerJoin(caseCategories, eq(categoryDetectionRules.category_id, caseCategories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(
        desc(categoryDetectionRules.priority),
        desc(categoryDetectionRules.created_at)
      )

    return NextResponse.json({ rules })
  } catch (error) {
    defaultLogger.error('Error fetching category detection rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create rules
    const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // Check if this is a bulk update request
    if (body.bulk && Array.isArray(body.rule_ids)) {
      return handleBulkUpdate(body, user.id)
    }

    const { category_id, keyword, priority = 0, is_active = true } = body

    if (!category_id || !keyword) {
      return NextResponse.json(
        { error: 'category_id and keyword are required' },
        { status: 400 }
      )
    }

    // Verify category exists
    const category = await db
      .select()
      .from(caseCategories)
      .where(eq(caseCategories.id, category_id))
      .limit(1)

    if (category.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await db
      .select()
      .from(categoryDetectionRules)
      .where(
        and(
          eq(categoryDetectionRules.category_id, category_id),
          eq(categoryDetectionRules.keyword, keyword)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A rule with this category and keyword already exists' },
        { status: 400 }
      )
    }

    const [newRule] = await db
      .insert(categoryDetectionRules)
      .values({
        category_id,
        keyword,
        priority: priority || 0,
        is_active: is_active !== false,
        created_by: user.id,
        updated_by: user.id,
      })
      .returning()

    defaultLogger.info('Category detection rule created:', {
      ruleId: newRule.id,
      categoryId: category_id,
      keyword,
    })

    // Clear cache so new rule is immediately available
    clearCategoryRulesCache()

    return NextResponse.json({ rule: newRule }, { status: 201 })
  } catch (error) {
    defaultLogger.error('Error creating category detection rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleBulkUpdate(body: any, userId: string) {
  const { rule_ids, updates } = body

  if (!Array.isArray(rule_ids) || rule_ids.length === 0) {
    return NextResponse.json(
      { error: 'rule_ids array is required and must not be empty' },
      { status: 400 }
    )
  }

  if (!updates || typeof updates !== 'object') {
    return NextResponse.json(
      { error: 'updates object is required' },
      { status: 400 }
    )
  }

  // Validate category if being updated
  if (updates.category_id) {
    const category = await db
      .select()
      .from(caseCategories)
      .where(eq(caseCategories.id, updates.category_id))
      .limit(1)

    if (category.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      )
    }
  }

  const updateData: any = {
    updated_at: new Date(),
    updated_by: userId,
  }

  if (updates.category_id !== undefined) updateData.category_id = updates.category_id
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active

  // Use IN clause for bulk update
  const updatedRules = await db
    .update(categoryDetectionRules)
    .set(updateData)
    .where(inArray(categoryDetectionRules.id, rule_ids))
    .returning()

  defaultLogger.info('Category detection rules bulk updated:', {
    count: updatedRules.length,
    ruleIds: rule_ids,
    updates: Object.keys(updateData),
  })

  // Clear cache
  clearCategoryRulesCache()

  return NextResponse.json({ 
    success: true, 
    updated: updatedRules.length,
    rules: updatedRules 
  })
}

