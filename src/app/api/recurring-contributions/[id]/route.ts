import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

/**
 * PATCH /api/recurring-contributions/[id]
 * Update a recurring contribution (e.g., status changes for pause/resume/cancel)
 */
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, action } = body

    // Verify the contribution belongs to the user
    const { data: existingContrib, error: fetchError } = await supabase
      .from('recurring_contributions')
      .select('donor_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingContrib) {
      return NextResponse.json({ 
        error: 'Recurring contribution not found' 
      }, { status: 404 })
    }

    if (existingContrib.donor_id !== user.id) {
      return NextResponse.json({ 
        error: 'Forbidden' 
      }, { status: 403 })
    }

    // Determine new status based on action or direct status
    let newStatus = status
    if (action === 'pause') {
      newStatus = 'paused'
    } else if (action === 'resume') {
      newStatus = 'active'
    } else if (action === 'cancel') {
      newStatus = 'cancelled'
    }

    if (!newStatus) {
      return NextResponse.json({ 
        error: 'Status or action is required' 
      }, { status: 400 })
    }

    // Validate status values
    const validStatuses = ['active', 'paused', 'cancelled', 'completed']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Update the contribution
    const { data: updatedContrib, error: updateError } = await supabase
      .from('recurring_contributions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating recurring contribution:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update recurring contribution',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json(updatedContrib)
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/recurring-contributions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
