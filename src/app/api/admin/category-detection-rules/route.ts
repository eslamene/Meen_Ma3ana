/**
 * Admin Category Detection Rules API Route
 * GET /api/admin/category-detection-rules - Get all category detection rules
 * POST /api/admin/category-detection-rules - Create a new rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'
import { db } from '@/lib/db'
import { categoryDetectionRules, caseCategories } from '@/drizzle/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { clearCategoryRulesCache } from '@/lib/utils/category-detection'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    const whereConditions: ReturnType<typeof eq>[] = []

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
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user, logger } = context

  // Only super_admin can create rules
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can create rules', 403)
  }

    const body = await request.json()
    
    // Check if this is a bulk update request
    if (body.bulk && Array.isArray(body.rule_ids)) {
      return handleBulkUpdate(body, user.id, logger)
    }

    const { category_id, keyword, priority = 0, is_active = true } = body

    if (!category_id || !keyword) {
      throw new ApiError('VALIDATION_ERROR', 'category_id and keyword are required', 400)
    }

    // Verify category exists
    const category = await db
      .select()
      .from(caseCategories)
      .where(eq(caseCategories.id, category_id))
      .limit(1)

    if (category.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Category not found', 400)
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
      throw new ApiError('VALIDATION_ERROR', 'A rule with this category and keyword already exists', 400)
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

    logger.info('Category detection rule created', {
      ruleId: newRule.id,
      categoryId: category_id,
      keyword,
    })

    // Clear cache so new rule is immediately available
    clearCategoryRulesCache()

    return NextResponse.json({ rule: newRule }, { status: 201 })
}

type BulkUpdateBody = {
  bulk?: boolean
  rule_ids: string[]
  updates: {
    category_id?: string
    keyword?: string
    priority?: number
    is_active?: boolean
  }
}

async function handleBulkUpdate(body: BulkUpdateBody, userId: string, logger: ApiHandlerContext['logger']) {
  const { rule_ids, updates } = body

  if (!Array.isArray(rule_ids) || rule_ids.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'rule_ids array is required and must not be empty', 400)
  }

  if (!updates || typeof updates !== 'object') {
    throw new ApiError('VALIDATION_ERROR', 'updates object is required', 400)
  }

  // Validate category if being updated
  if (updates.category_id) {
    const category = await db
      .select()
      .from(caseCategories)
      .where(eq(caseCategories.id, updates.category_id))
      .limit(1)

    if (category.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Category not found', 400)
    }
  }

  const updateData: { updated_at: Date; updated_by: string; [key: string]: unknown } = {
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

  logger.info('Category detection rules bulk updated', {
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

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/category-detection-rules' 
})

export const POST = createPostHandler(postHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/category-detection-rules' 
})

