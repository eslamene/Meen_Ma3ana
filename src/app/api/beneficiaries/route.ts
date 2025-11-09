import { NextRequest, NextResponse } from 'next/server'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { createClient } from '@supabase/supabase-js'

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
    
    // Create service role client to bypass RLS for beneficiary creation
    // This allows authorized users (via API route) to create beneficiaries
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Use BeneficiaryService but with service role client
    // We'll need to create a method that accepts a client, or create directly here
    const supabase = serviceRoleClient
    
    // Check if beneficiary already exists
    let existingQuery = supabase
      .from('beneficiaries')
      .select('*')
      .limit(1)
    
    if (body.mobile_number && body.national_id) {
      existingQuery = existingQuery.or(`mobile_number.eq.${body.mobile_number},national_id.eq.${body.national_id}`)
    } else if (body.mobile_number) {
      existingQuery = existingQuery.eq('mobile_number', body.mobile_number)
    } else if (body.national_id) {
      existingQuery = existingQuery.eq('national_id', body.national_id)
    }
    
    const { data: existing, error: existingError } = await existingQuery.maybeSingle()
    
    // If there's an error other than "no rows found", log it but continue
    if (existingError && existingError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking existing beneficiary:', existingError)
    }
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary with this mobile number or national ID already exists' },
        { status: 400 }
      )
    }
    
    // Convert age to year of birth
    const dataToInsert: any = { ...body }
    if (body.age) {
      const currentYear = new Date().getFullYear()
      dataToInsert.year_of_birth = currentYear - body.age
      delete dataToInsert.age
    }
    
    // Filter out empty strings for UUID fields
    if (dataToInsert.id_type_id === '' || dataToInsert.id_type_id === null) {
      delete dataToInsert.id_type_id
    }
    if (dataToInsert.city_id === '' || dataToInsert.city_id === null) {
      delete dataToInsert.city_id
    }
    
    // Remove undefined values
    Object.keys(dataToInsert).forEach(key => {
      if (dataToInsert[key] === undefined) {
        delete dataToInsert[key]
      }
    })
    
    const { data: beneficiary, error } = await supabase
      .from('beneficiaries')
      .insert([dataToInsert])
      .select()
      .single()
    
    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating beneficiary:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create beneficiary' },
        { status: 500 }
      )
    }
    
    // Transform beneficiary to include calculated age
    if (beneficiary.year_of_birth) {
      const currentYear = new Date().getFullYear()
      beneficiary.age = currentYear - beneficiary.year_of_birth
    }
    
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
