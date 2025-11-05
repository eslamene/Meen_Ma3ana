import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

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

    // Handle image URLs - store in case_images table
    if (body.images && Array.isArray(body.images)) {
      // First, delete existing images for this case
      await supabase
        .from('case_images')
        .delete()
        .eq('case_id', id)

      // Insert new images
      const imageRecords = body.images.map((imageUrl: string, index: number) => {
        const fileName = imageUrl.split('/').pop() || 'image.jpg'
        const imagePath = imageUrl.replace(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/', '')
        
        return {
          case_id: id,
          image_url: imageUrl,
          image_path: imagePath,
          file_name: fileName,
          is_primary: index === 0, // First image is primary
          display_order: index
          // created_at and updated_at will be set automatically by the database
        }
      })

      const { error: imagesError } = await supabase
        .from('case_images')
        .insert(imageRecords)

      if (imagesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error inserting case images:', imagesError)
        return NextResponse.json(
          { error: 'Failed to save images', details: imagesError.message },
          { status: 500 }
        )
      }
    }

    // Handle other fields if provided
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.targetAmount !== undefined) updateData.target_amount = parseFloat(body.targetAmount)
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.location !== undefined) updateData.location = body.location
    if (body.beneficiaryName !== undefined) updateData.beneficiary_name = body.beneficiaryName
    if (body.beneficiaryContact !== undefined) updateData.beneficiary_contact = body.beneficiaryContact

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
    const supabase = await createClient()

    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        *,
        case_categories(name)
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

    return NextResponse.json({ case: caseData })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in case GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

