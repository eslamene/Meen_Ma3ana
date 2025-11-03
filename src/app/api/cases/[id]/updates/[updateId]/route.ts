import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caseUpdateService } from '@/lib/case-updates'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; updateId: string } }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, updateType, isPublic, attachments } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Check if user can edit this update
    const existingUpdate = await caseUpdateService.getUpdateById(params.updateId)

    if (!existingUpdate) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or the creator of the update
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin' && existingUpdate.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const result = await caseUpdateService.updateUpdate(params.updateId, {
      title,
      content,
      updateType,
      isPublic,
      attachments,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      update: result.update
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating case update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; updateId: string } }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can delete this update
    const existingUpdate = await caseUpdateService.getUpdateById(params.updateId)

    if (!existingUpdate) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or the creator of the update
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin' && existingUpdate.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const result = await caseUpdateService.deleteUpdate(params.updateId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting case update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 