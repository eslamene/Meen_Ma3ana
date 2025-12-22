import { NextRequest, NextResponse } from 'next/server'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { withApiHandler, ApiHandlerContext, createGetHandler, createPostHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const cityId = searchParams.get('cityId') || ''
  const riskLevel = searchParams.get('riskLevel') || ''

  // Create service role client to bypass RLS for beneficiary fetching
  // This allows authorized users (via API route) to fetch beneficiaries
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for beneficiary operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }
    
    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch directly using service role client to bypass RLS
    let query = serviceRoleClient
      .from('beneficiaries')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile_number.ilike.%${search}%,national_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply city filter
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    // Apply risk level filter
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiaries:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message || 'Failed to fetch beneficiaries', 500)
    }

    // Transform beneficiaries to include calculated age
    const beneficiaries = (data || []).map((beneficiary: { year_of_birth?: number; age?: number; [key: string]: unknown }) => {
      if (beneficiary.year_of_birth) {
        const currentYear = new Date().getFullYear()
        beneficiary.age = currentYear - beneficiary.year_of_birth
      }
      return beneficiary
    })

    return NextResponse.json({
      success: true,
      data: beneficiaries
    })
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  
  const body = await request.json()
  
  // Create service role client to bypass RLS for beneficiary creation
  // This allows authorized users (via API route) to create beneficiaries
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for beneficiary operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }
    
    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
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
      throw new ApiError('VALIDATION_ERROR', 'Beneficiary with this mobile number or national ID already exists', 400)
    }
    
    // Convert age to year of birth
    const dataToInsert: Record<string, unknown> = { ...body }
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
      throw new ApiError('INTERNAL_SERVER_ERROR', error.message || 'Failed to create beneficiary', 500)
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
}

export const GET = createGetHandler(getHandler, { loggerContext: 'api/beneficiaries' })
export const POST = createPostHandler(postHandler, { loggerContext: 'api/beneficiaries' })
