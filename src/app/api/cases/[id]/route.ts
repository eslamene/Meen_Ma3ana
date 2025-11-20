import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'
import { db } from '@/lib/db'
import { categoryDetectionRules } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { isValidUUID } from '@/lib/utils/uuid'

export async function PATCH(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const body = await request.json()

    // Build update object dynamically based on what's provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle image URLs - store in case_files table (legacy support)
    // Note: New code should save directly to case_files during upload
    if (body.images && Array.isArray(body.images)) {
      // First, delete existing photo files for this case (only photos category)
      await supabase
        .from('case_files')
        .delete()
        .eq('case_id', id)
        .eq('category', 'photos')

      // Insert new images as case_files records
      const imageRecords = body.images.map((imageUrl: string, index: number) => {
        const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'image.jpg'
        // Extract file path from URL if it contains storage path
        const storagePathMatch = imageUrl.match(/case-files\/(.+)/)
        const filePath = storagePathMatch ? `case-files/${storagePathMatch[1]}` : null
        
        return {
          case_id: id,
          filename: fileName,
          original_filename: fileName,
          file_url: imageUrl,
          file_path: filePath,
          file_type: 'image/jpeg', // Default, could be improved by detecting from URL or file
          file_size: 0, // Unknown from URL alone
          category: 'photos',
          is_primary: index === 0, // First image is primary
          display_order: index,
          is_public: false,
          uploaded_by: user.id
        }
      })

      const { error: imagesError } = await supabase
        .from('case_files')
        .insert(imageRecords)

      if (imagesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error inserting case files:', imagesError)
        return NextResponse.json(
          { error: 'Failed to save images', details: imagesError.message },
          { status: 500 }
        )
      }
    }

    // Handle other fields if provided
    if (body.title_en !== undefined) updateData.title_en = body.title_en
    if (body.title_ar !== undefined) updateData.title_ar = body.title_ar
    if (body.description_en !== undefined) updateData.description_en = body.description_en
    if (body.description_ar !== undefined) updateData.description_ar = body.description_ar
    // Legacy support - map old fields to new structure
    if (body.title !== undefined && body.title_en === undefined) updateData.title_en = body.title
    if (body.description !== undefined && body.description_en === undefined) updateData.description_en = body.description
    if (body.targetAmount !== undefined) updateData.target_amount = parseFloat(body.targetAmount)
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.location !== undefined) updateData.location = body.location
    if (body.beneficiaryName !== undefined) updateData.beneficiary_name = body.beneficiaryName
    if (body.beneficiaryContact !== undefined) updateData.beneficiary_contact = body.beneficiaryContact
    if (body.category_id !== undefined) updateData.category_id = body.category_id

    // Update the case only if there are fields to update
    if (Object.keys(updateData).length > 1) { // More than just updated_at
      const { error: updateError } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating case:', updateError)
        return NextResponse.json(
          { error: 'Failed to update case', details: updateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'Case updated successfully'
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in case PATCH API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    
    // Validate UUID format before making database queries
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid case ID format' },
        { status: 404 }
      )
    }
    
    const supabase = await createClient()

    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        id,
        title_en,
        title_ar,
        description_en,
        description_ar,
        target_amount,
        current_amount,
        status,
        type,
        priority,
        location,
        beneficiary_name,
        beneficiary_contact,
        created_at,
        updated_at,
        created_by,
        category_id,
        case_categories(name, icon, color)
      `)
      .eq('id', id)
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case:', error)
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Fetch category detection rules if case has a category and filter by matches
    let detectionRules: string[] = []
    if (caseData.category_id) {
      try {
        const rules = await db
          .select({
            keyword: categoryDetectionRules.keyword,
            priority: categoryDetectionRules.priority,
          })
          .from(categoryDetectionRules)
          .where(
            and(
              eq(categoryDetectionRules.category_id, caseData.category_id),
              eq(categoryDetectionRules.is_active, true)
            )
          )
          .orderBy(desc(categoryDetectionRules.priority), desc(categoryDetectionRules.created_at))

        // Combine title and description for matching
        const titleEn = (caseData.title_en || '').toLowerCase()
        const titleAr = (caseData.title_ar || '').toLowerCase()
        const descriptionEn = (caseData.description_en || '').toLowerCase()
        const descriptionAr = (caseData.description_ar || '').toLowerCase()
        const searchText = `${titleEn} ${titleAr} ${descriptionEn} ${descriptionAr}`

        // Filter rules to only include keywords that match the case title or description
        const matchedKeywords = rules
          .filter(rule => {
            const keywordLower = rule.keyword.toLowerCase()
            return searchText.includes(keywordLower)
          })
          .slice(0, 20) // Limit to top 20 matched keywords by priority
          .map(r => r.keyword)

        detectionRules = matchedKeywords
      } catch (rulesError) {
        // Log but don't fail the request if rules fetch fails
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching detection rules:', rulesError)
      }
    }

    return NextResponse.json({ 
      case: {
        ...caseData,
        detectionRules // Return matched keywords as array
      }
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in case GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

