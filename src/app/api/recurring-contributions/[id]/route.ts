import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function PUT(request: NextRequest, {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, nextContributionDate, notes } = body

    // Validate that the recurring contribution belongs to the user
    const { data: existingContribution, error: fetchError } = await supabase
      .from('recurring_contributions')
      .select('*')
      .eq('id', params.id)
      .eq('donor_id', user.id)
      .single()

    if (fetchError || !existingContribution) {
      return NextResponse.json({ error: 'Recurring contribution not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (nextContributionDate) updateData.next_contribution_date = nextContributionDate
    if (notes !== undefined) updateData.notes = notes
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('recurring_contributions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating recurring contribution:', error)
      return NextResponse.json({ error: 'Failed to update recurring contribution' }, { status: 500 })
    }

    return NextResponse.json({ recurringContribution: data })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in recurring contribution API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the recurring contribution belongs to the user
    const { data: existingContribution, error: fetchError } = await supabase
      .from('recurring_contributions')
      .select('*')
      .eq('id', params.id)
      .eq('donor_id', user.id)
      .single()

    if (fetchError || !existingContribution) {
      return NextResponse.json({ error: 'Recurring contribution not found' }, { status: 404 })
    }

    // Instead of deleting, mark as cancelled
    const { error } = await supabase
      .from('recurring_contributions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error cancelling recurring contribution:', error)
      return NextResponse.json({ error: 'Failed to cancel recurring contribution' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Recurring contribution cancelled successfully' })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in recurring contribution API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 