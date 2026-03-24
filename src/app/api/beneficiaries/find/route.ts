import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
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
  
  const { BeneficiaryService } = await import('@/lib/services/beneficiaryService')
  
  try {
    // If searching by identifier (mobile number or national ID)
    if (mobileNumber || nationalId) {
      const beneficiary = await BeneficiaryService.findByIdentifier(
        serviceRoleClient,
        mobileNumber || undefined,
        nationalId || undefined
      )
      
      return NextResponse.json({
        success: true,
        data: beneficiary || null
      })
    }
    
    // If searching by query string
    if (query) {
      const limit = parseInt(searchParams.get('limit') || '10')
      const beneficiaries = await BeneficiaryService.search(serviceRoleClient, {
        query,
        limit
      })
      
      return NextResponse.json({
        success: true,
        data: beneficiaries
      })
    }
    
    throw new ApiError('VALIDATION_ERROR', 'Either mobileNumber, nationalId, or query parameter is required', 400)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error finding/searching beneficiaries:', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to find/search beneficiaries', 500)
  }
}

export const GET = createGetHandler(handler, { loggerContext: 'api/beneficiaries/find' })

