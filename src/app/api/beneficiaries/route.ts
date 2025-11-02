import { NextRequest, NextResponse } from 'next/server'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const cityId = searchParams.get('cityId') || ''
    const riskLevel = searchParams.get('riskLevel') || ''

    const beneficiaries = await BeneficiaryService.getAll({
      page,
      limit,
      search,
      cityId,
      riskLevel
    })

    return NextResponse.json({
      success: true,
      data: beneficiaries
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiaries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch beneficiaries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const body = await request.json()
    
    const beneficiary = await BeneficiaryService.create(body)

    return NextResponse.json({
      success: true,
      data: beneficiary
    }, { status: 201 })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create beneficiary' },
      { status: 500 }
    )
  }
}
