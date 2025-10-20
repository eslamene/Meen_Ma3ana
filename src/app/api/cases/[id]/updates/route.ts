import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caseUpdateService } from '@/lib/case-updates'
import { caseNotificationService } from '@/lib/notifications/case-notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const includePrivate = searchParams.get('includePrivate') === 'true'
    const resolvedParams = await params
    
    const updates = await caseUpdateService.getDynamicUpdates({
      caseId: resolvedParams.id,
      isPublic: includePrivate ? undefined : true,
      limit: 50
    })
    
    return NextResponse.json({
      updates: updates || []
    })
  } catch (error) {
    console.error('Error in case updates API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const newUpdate = await caseUpdateService.createUpdate({
      caseId: resolvedParams.id,
      title,
      content,
      updateType,
      isPublic,
      attachments,
      createdBy: user.id,
    })

    // Send notification for the new update
    try {
      await caseNotificationService.createCaseUpdateNotification(
        resolvedParams.id,
        newUpdate.id,
        newUpdate.title,
        newUpdate.updateType,
        user.id
      )
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      update: newUpdate
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating case update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 