import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { withApiHandler, ApiHandlerContext, createGetHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  
  const { searchParams } = new URL(request.url)
  const mobileNumber = searchParams.get('mobileNumber') || ''
  const nationalId = searchParams.get('nationalId') || ''
  const query = searchParams.get('query') || ''
  
  // Create service role client to bypass RLS
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError('CONFIGURATION_ERROR', 'SUPABASE_SERVICE_ROLE_KEY is required for this operation', 500)
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
        throw new ApiError('INTERNAL_SERVER_ERROR', error.message || 'Failed to find beneficiary', 500)
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
        throw new ApiError('INTERNAL_SERVER_ERROR', error.message || 'Failed to search beneficiaries', 500)
      }
      
      // Transform beneficiaries to include calculated age
      const transformedResults = (results || []).map((beneficiary: { year_of_birth?: number; age?: number; [key: string]: unknown }) => {
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
    
    throw new ApiError('VALIDATION_ERROR', 'Either mobileNumber, nationalId, or query parameter is required', 400)
}

export const GET = createGetHandler(handler, { loggerContext: 'api/beneficiaries/find' })

