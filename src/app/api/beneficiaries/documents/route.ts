import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    const insertData = {
      ...body,
      uploaded_by: user.id
    }

    const { data: document, error } = await supabase
      .from('beneficiary_documents')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary document:', error)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in beneficiary documents POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

