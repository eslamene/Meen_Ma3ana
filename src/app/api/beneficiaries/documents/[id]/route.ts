import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
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

    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { document: null },
          { status: 404 }
        )
      }
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary document:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document: data })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in beneficiary document GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const { data: document, error } = await supabase
      .from('beneficiary_documents')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating beneficiary document:', error)
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in beneficiary document PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from('beneficiary_documents')
      .delete()
      .eq('id', id)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary document:', error)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in beneficiary document DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

