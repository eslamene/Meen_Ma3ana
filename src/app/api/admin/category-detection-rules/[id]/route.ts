/**
 * Admin Category Detection Rule API Route
 * PUT /api/admin/category-detection-rules/[id] - Update a rule
 * DELETE /api/admin/category-detection-rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { adminService } from '@/lib/admin/service'
import { db } from '@/lib/db'
import { categoryDetectionRules, caseCategories } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { clearCategoryRulesCache } from '@/lib/utils/category-detection'

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, logger } = context

  // Only super_admin can update rules
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can update rules', 403)
  }

    const body = await request.json()
    const { category_id, keyword, priority, is_active } = body

    // Check if rule exists
    const existing = await db
      .select()
      .from(categoryDetectionRules)
      .where(eq(categoryDetectionRules.id, params.id))
      .limit(1)

    if (existing.length === 0) {
      throw new ApiError('NOT_FOUND', 'Rule not found', 404)
    }

    // If category_id is being changed, verify it exists
    if (category_id && category_id !== existing[0].category_id) {
      const category = await db
        .select()
        .from(caseCategories)
        .where(eq(caseCategories.id, category_id))
        .limit(1)

      if (category.length === 0) {
        throw new ApiError('VALIDATION_ERROR', 'Category not found', 400)
      }
    }

    // If category_id or keyword is being changed, check for duplicates
    if ((category_id && category_id !== existing[0].category_id) ||
        (keyword && keyword !== existing[0].keyword)) {
      const finalCategoryId = category_id || existing[0].category_id
      const finalKeyword = keyword || existing[0].keyword

      const duplicate = await db
        .select()
        .from(categoryDetectionRules)
        .where(
          and(
            eq(categoryDetectionRules.category_id, finalCategoryId),
            eq(categoryDetectionRules.keyword, finalKeyword)
          )
        )

      // Filter out the current rule in JavaScript
      const duplicateExists = duplicate.some(r => r.id !== params.id)

      if (duplicateExists) {
        throw new ApiError('VALIDATION_ERROR', 'A rule with this category and keyword already exists', 400)
      }
    }

    const updateData: { updated_at: Date; updated_by: string; [key: string]: unknown } = {
      updated_at: new Date(),
      updated_by: user.id,
    }

    if (category_id !== undefined) updateData.category_id = category_id
    if (keyword !== undefined) updateData.keyword = keyword
    if (priority !== undefined) updateData.priority = priority
    if (is_active !== undefined) updateData.is_active = is_active

    const [updatedRule] = await db
      .update(categoryDetectionRules)
      .set(updateData)
      .where(eq(categoryDetectionRules.id, params.id))
      .returning()

    logger.info('Category detection rule updated', {
      ruleId: params.id,
      updates: Object.keys(updateData),
    })

    // Clear cache so updated rule is immediately available
    clearCategoryRulesCache()

    return NextResponse.json({ rule: updatedRule })
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { user, logger } = context

  // Only super_admin can delete rules
  const isSuperAdmin = await adminService.hasRole(user.id, 'super_admin')
  if (!isSuperAdmin) {
    throw new ApiError('FORBIDDEN', 'Only super_admin can delete rules', 403)
  }

    // Check if rule exists
    const existing = await db
      .select()
      .from(categoryDetectionRules)
      .where(eq(categoryDetectionRules.id, params.id))
      .limit(1)

    if (existing.length === 0) {
      throw new ApiError('NOT_FOUND', 'Rule not found', 404)
    }

    await db
      .delete(categoryDetectionRules)
      .where(eq(categoryDetectionRules.id, params.id))

    logger.info('Category detection rule deleted', {
      ruleId: params.id,
      categoryId: existing[0].category_id,
      keyword: existing[0].keyword,
    })

    // Clear cache so deletion is immediately reflected
    clearCategoryRulesCache()

    return NextResponse.json({ success: true })
}

export const PUT = createPutHandlerWithParams(putHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/category-detection-rules/[id]' 
})

export const DELETE = createDeleteHandlerWithParams(deleteHandler, { 
  requireAdmin: true, // Will be further restricted to super_admin in handler
  loggerContext: 'api/admin/category-detection-rules/[id]' 
})

