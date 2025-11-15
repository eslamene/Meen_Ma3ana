import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const supabase = await createClient()
    const params = await context.params
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update message as read (only if user is the recipient)
    const { error: updateError } = await supabase
      .from('communications')
      .update({ is_read: true })
      .eq('id', params.id)
      .eq('recipient_id', user.id)

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error marking message as read:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in mark message as read API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

