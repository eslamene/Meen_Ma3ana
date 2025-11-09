import { NextRequest, NextResponse } from 'next/server'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { createClient } from '@supabase/supabase-js'
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
    const beneficiary = await BeneficiaryService.getById(id)

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
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const body = await request.json()
    
    // Create service role client to bypass RLS for beneficiary update
    // This allows authorized users (via API route) to update beneficiaries
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
    
    // Verify beneficiary exists first
    const { data: existing } = await serviceRoleClient
      .from('beneficiaries')
      .select('id')
      .eq('id', id)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      )
    }
    
    // Start with a clean object - only include fields that should be updated
    const dataToUpdate: Record<string, unknown> = {}
    
    // Convert age to year of birth if age is provided
    if (body.age !== undefined && body.age !== null && body.age !== '') {
      const currentYear = new Date().getFullYear()
      dataToUpdate.year_of_birth = currentYear - Number(body.age)
    }
    
    // Only include fields that exist in the database schema and should be updatable
    if (body.name !== undefined && body.name !== null && body.name !== '') {
      dataToUpdate.name = body.name
    }
    if (body.name_ar !== undefined && body.name_ar !== null && body.name_ar !== '') {
      dataToUpdate.name_ar = body.name_ar
    }
    if (body.gender !== undefined && body.gender !== null && body.gender !== '') {
      dataToUpdate.gender = body.gender
    }
    if (body.mobile_number !== undefined && body.mobile_number !== null && body.mobile_number !== '') {
      dataToUpdate.mobile_number = body.mobile_number
    }
    if (body.additional_mobile_number !== undefined && body.additional_mobile_number !== null && body.additional_mobile_number !== '') {
      dataToUpdate.additional_mobile_number = body.additional_mobile_number
    }
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      dataToUpdate.email = body.email
    }
    if (body.alternative_contact !== undefined && body.alternative_contact !== null && body.alternative_contact !== '') {
      dataToUpdate.alternative_contact = body.alternative_contact
    }
    if (body.national_id !== undefined && body.national_id !== null && body.national_id !== '') {
      dataToUpdate.national_id = body.national_id
    }
    if (body.id_type !== undefined && body.id_type !== null && body.id_type !== '') {
      dataToUpdate.id_type = body.id_type
    }
    // Prefer city_id over city if both are provided
    if (body.city_id !== undefined && body.city_id !== null && body.city_id !== '') {
      dataToUpdate.city_id = body.city_id
    } else if (body.city !== undefined && body.city !== null && body.city !== '') {
      dataToUpdate.city = body.city
    }
    // id_type_id - only if not empty
    if (body.id_type_id !== undefined && body.id_type_id !== null && body.id_type_id !== '') {
      dataToUpdate.id_type_id = body.id_type_id
    }
    if (body.address !== undefined && body.address !== null && body.address !== '') {
      dataToUpdate.address = body.address
    }
    if (body.governorate !== undefined && body.governorate !== null && body.governorate !== '') {
      dataToUpdate.governorate = body.governorate
    }
    if (body.country !== undefined && body.country !== null && body.country !== '') {
      dataToUpdate.country = body.country
    }
    if (body.medical_condition !== undefined && body.medical_condition !== null && body.medical_condition !== '') {
      dataToUpdate.medical_condition = body.medical_condition
    }
    if (body.social_situation !== undefined && body.social_situation !== null && body.social_situation !== '') {
      dataToUpdate.social_situation = body.social_situation
    }
    if (body.family_size !== undefined && body.family_size !== null) {
      dataToUpdate.family_size = body.family_size
    }
    if (body.dependents !== undefined && body.dependents !== null) {
      dataToUpdate.dependents = body.dependents
    }
    if (body.notes !== undefined && body.notes !== null && body.notes !== '') {
      dataToUpdate.notes = body.notes
    }
    if (body.risk_level !== undefined && body.risk_level !== null && body.risk_level !== '') {
      dataToUpdate.risk_level = body.risk_level
    }
    if (body.is_verified !== undefined && body.is_verified !== null) {
      dataToUpdate.is_verified = body.is_verified
    }
    if (body.verification_date !== undefined && body.verification_date !== null && body.verification_date !== '') {
      dataToUpdate.verification_date = body.verification_date
    }
    if (body.verification_notes !== undefined && body.verification_notes !== null && body.verification_notes !== '') {
      dataToUpdate.verification_notes = body.verification_notes
    }
    if (body.tags !== undefined && body.tags !== null && Array.isArray(body.tags) && body.tags.length > 0) {
      dataToUpdate.tags = body.tags
    }
    
    // Ensure we have at least one field to update
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }
    
    const { data: beneficiary, error } = await serviceRoleClient
      .from('beneficiaries')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      logger.error('Error updating beneficiary:', error, { beneficiaryId: id, updateData: dataToUpdate })
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update beneficiary' },
        { status: 500 }
      )
    }
    
    if (!beneficiary) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found after update' },
        { status: 404 }
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
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    await BeneficiaryService.delete(id)

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
