import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const mobileNumber = searchParams.get('mobileNumber') || ''
    const nationalId = searchParams.get('nationalId') || ''
    const query = searchParams.get('query') || ''
    
    // Create service role client to bypass RLS
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
    
    // If searching by identifier (mobile number or national ID)
    if (mobileNumber || nationalId) {
      let beneficiaryQuery = serviceRoleClient
        .from('beneficiaries')
        .select('*')
      
      if (mobileNumber && nationalId) {
        beneficiaryQuery = beneficiaryQuery.or(`mobile_number.eq.${mobileNumber},national_id.eq.${nationalId}`)
      } else if (mobileNumber) {
        beneficiaryQuery = beneficiaryQuery.eq('mobile_number', mobileNumber)
      } else if (nationalId) {
        beneficiaryQuery = beneficiaryQuery.eq('national_id', nationalId)
      }
      
      const { data, error } = await beneficiaryQuery.limit(1).maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error finding beneficiary by identifier:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to find beneficiary' },
          { status: 500 }
        )
      }
      
      // Transform beneficiary to include calculated age
      const beneficiary = data
      if (beneficiary && beneficiary.year_of_birth) {
        const currentYear = new Date().getFullYear()
        beneficiary.age = currentYear - beneficiary.year_of_birth
      }
      
      return NextResponse.json({
        success: true,
        data: beneficiary || null
      })
    }
    
    // If searching by query string
    if (query) {
      const limit = parseInt(searchParams.get('limit') || '10')
      const searchQuery = serviceRoleClient
        .from('beneficiaries')
        .select('*')
        .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      const { data: results, error } = await searchQuery
      
      if (error) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error searching beneficiaries:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to search beneficiaries' },
          { status: 500 }
        )
      }
      
      // Transform beneficiaries to include calculated age
      const transformedResults = (results || []).map((beneficiary: any) => {
        if (beneficiary.year_of_birth) {
          const currentYear = new Date().getFullYear()
          beneficiary.age = currentYear - beneficiary.year_of_birth
        }
        return beneficiary
      })
      
      return NextResponse.json({
        success: true,
        data: transformedResults
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Either mobileNumber, nationalId, or query parameter is required' },
      { status: 400 }
    )
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error finding beneficiary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to find beneficiary' },
      { status: 500 }
    )
  }
}

