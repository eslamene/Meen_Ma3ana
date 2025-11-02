import { NextRequest, NextResponse } from 'next/server'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const beneficiary = await BeneficiaryService.getById(params.id)

    if (!beneficiary) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: beneficiary
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch beneficiary' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const beneficiary = await BeneficiaryService.update(params.id, body)

    return NextResponse.json({
      success: true,
      data: beneficiary
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update beneficiary' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    await BeneficiaryService.delete(params.id)

    return NextResponse.json({
      success: true,
      message: 'Beneficiary deleted successfully'
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete beneficiary' },
      { status: 500 }
    )
  }
}
