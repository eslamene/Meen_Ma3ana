import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'
import { BUCKET_NAMES } from '@/lib/utils/storageBuckets'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    
    // Create service role client to bypass RLS for beneficiary fetching
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
    
    // Fetch beneficiary directly using service role client
    const { data, error } = await serviceRoleClient
      .from('beneficiaries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { success: false, error: 'Beneficiary not found' },
          { status: 404 }
        )
      }
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch beneficiary' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      )
    }

    // Transform beneficiary to include calculated age
    const beneficiary = data
    if (beneficiary.year_of_birth) {
      const currentYear = new Date().getFullYear()
      beneficiary.age = currentYear - beneficiary.year_of_birth
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
    
    // Create service role client to bypass RLS for beneficiary deletion
    // This allows authorized users (via API route) to delete beneficiaries
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
    
    // Fetch all beneficiary documents before transaction (needed for storage deletion)
    const { data: documents, error: documentsError } = await serviceRoleClient
      .from('beneficiary_documents')
      .select('*')
      .eq('beneficiary_id', id)
    
    if (documentsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching beneficiary documents:', documentsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch beneficiary documents for deletion' },
        { status: 500 }
      )
    }
    
    const documentsCount = documents?.length || 0
    logger.info(`Found ${documentsCount} document(s) to delete for beneficiary ${id}`)
    
    // First, fetch beneficiary details to check cases by name/contact as well
    // Cases may be linked via beneficiary_id OR via beneficiary_name/beneficiary_contact
    const { data: beneficiary, error: beneficiaryError } = await serviceRoleClient
      .from('beneficiaries')
      .select('id, name, mobile_number, national_id')
      .eq('id', id)
      .single()
    
    if (beneficiaryError || !beneficiary) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      )
    }
    
    // Safety check: Check for cases linked to this beneficiary
    // Cases can be linked via beneficiary_id OR via beneficiary_name/beneficiary_contact
    // We need to check all possible links
    let casesByBeneficiaryId: any[] = []
    
    // Check cases linked via beneficiary_id
    const { data: casesById, error: casesByIdError, count: countById } = await serviceRoleClient
      .from('cases')
      .select('id, title_en, title_ar', { count: 'exact' })
      .eq('beneficiary_id', id)
    
    if (casesByIdError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking cases by beneficiary_id:', casesByIdError)
    } else {
      casesByBeneficiaryId = casesById || []
    }
    
    // Check cases linked via beneficiary_name or beneficiary_contact
    // Use OR query to check both name and contact
    let casesByNameContact: any[] = []
    let countByNameContact = 0
    
    // Build OR conditions for Supabase
    const orConditions: string[] = []
    if (beneficiary.name) {
      orConditions.push(`beneficiary_name.eq.${beneficiary.name}`)
    }
    if (beneficiary.mobile_number) {
      orConditions.push(`beneficiary_contact.eq.${beneficiary.mobile_number}`)
    }
    
    if (orConditions.length > 0) {
      const { data: casesByName, error: casesByNameError, count: countByName } = await serviceRoleClient
        .from('cases')
        .select('id, title_en, title_ar', { count: 'exact' })
        .or(orConditions.join(','))
      
      if (casesByNameError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking cases by name/contact:', casesByNameError)
      } else {
        casesByNameContact = casesByName || []
        countByNameContact = countByName ?? 0
      }
    }
    
    // Combine results and remove duplicates by ID
    const caseMap = new Map<string, any>()
    casesByBeneficiaryId.forEach(c => caseMap.set(c.id, c))
    casesByNameContact.forEach(c => caseMap.set(c.id, c))
    
    const allCases = Array.from(caseMap.values())
    const totalCasesCount = allCases.length
    const countByIdValue = countById ?? casesByBeneficiaryId.length
    const totalCount = Math.max(countByIdValue, countByNameContact, totalCasesCount)
    
    // Log for debugging
    logger.info(`Case check for beneficiary ${id} (${beneficiary.name}): by_id=${countByIdValue}, by_name/contact=${countByNameContact}, total=${totalCount}`)
    
    if (totalCount > 0) {
      logger.warn(`Blocking deletion of beneficiary ${id} - assigned to ${totalCount} case(s)`)
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete beneficiary. This beneficiary is assigned to ${totalCount} case(s). Please remove the beneficiary from all cases before deleting.`,
          assignedCasesCount: totalCount,
          assignedCases: allCases.map(c => ({
            id: c.id,
            title: c.title_en || c.title_ar || 'Untitled Case'
          }))
        },
        { status: 400 }
      )
    }
    
    logger.info(`No cases found for beneficiary ${id}, proceeding with deletion`)
    
    // Perform database operations within a transaction using RPC function
    // This ensures atomicity: verify existence, check cases, delete documents, delete beneficiary
    const { data: deletedData, error: rpcError } = await serviceRoleClient.rpc(
      'delete_beneficiary_with_documents',
      { p_beneficiary_id: id }
    )
    
    if (rpcError) {
      // Handle transaction errors from RPC function
      // If function doesn't exist (42883), fall back to manual deletion
      if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
        logger.warn('RPC function not found, falling back to manual deletion. Please run migration 066_create_delete_beneficiary_transaction.sql')
        // Fall through to manual deletion below
      } else if (rpcError.code === 'P0001' || rpcError.message?.includes('Beneficiary not found')) {
        return NextResponse.json(
          { success: false, error: 'Beneficiary not found' },
          { status: 404 }
        )
      } else if (rpcError.code === 'P0002' || rpcError.message?.includes('Cannot delete beneficiary')) {
        const caseCountMatch = rpcError.message?.match(/(\d+)/)
        const caseCount = caseCountMatch ? parseInt(caseCountMatch[1], 10) : 0
        return NextResponse.json(
          { 
            success: false, 
            error: rpcError.message || 'Cannot delete beneficiary with existing cases',
            assignedCasesCount: caseCount
          },
          { status: 400 }
        )
      } else {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Transaction error during beneficiary deletion:', rpcError)
        return NextResponse.json(
          { success: false, error: rpcError.message || 'Failed to delete beneficiary' },
          { status: 500 }
        )
      }
    }
    
    // If RPC succeeded, use its result
    if (deletedData && !rpcError) {
      // RPC function returns an array, get the first (and only) result
      const deletedBeneficiary = Array.isArray(deletedData) ? deletedData[0] : deletedData
      
      if (!deletedBeneficiary) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'No rows deleted - beneficiary may not exist or deletion was blocked')
        return NextResponse.json(
          { success: false, error: 'Beneficiary could not be deleted. It may not exist or may be referenced by other records.' },
          { status: 404 }
        )
      }
      
      logger.info(`Deleted ${documentsCount} document record(s) from database`)
      
      // Continue with storage deletion (code continues below)
      // Storage deletion happens after successful transaction
      // Delete files from storage bucket
      if (documents && documents.length > 0) {
        const bucketName = BUCKET_NAMES.BENEFICIARIES
        // Escape special regex characters in bucket name
        const escapedBucketName = bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Create regex pattern that matches the bucket name followed by a path
        const pathRegex = new RegExp(`${escapedBucketName}\\/(.+?)(?:\\?|$)`)
        
        let deletedFilesCount = 0
        let failedFilesCount = 0
        
        for (const document of documents) {
          if (!document.file_url) {
            logger.warn(`Document ${document.id} has no file_url, skipping storage deletion`)
            continue
          }
          
          // Extract file path from URL (handles both full URLs and relative paths)
          // Pattern: uses bucketName to construct regex dynamically
          const pathMatch = document.file_url.match(pathRegex)
          if (pathMatch && pathMatch[1]) {
            const filePath = pathMatch[1]
            
            try {
              const { error: storageError } = await serviceRoleClient.storage
                .from(bucketName)
                .remove([filePath])
              
              if (storageError) {
                logger.warn(`Failed to delete file from storage: ${filePath}`, { error: storageError })
                failedFilesCount++
              } else {
                deletedFilesCount++
                logger.info(`Successfully deleted file from storage: ${filePath}`)
              }
            } catch (storageErr) {
              logger.warn(`Error deleting file from storage: ${filePath}`, { error: storageErr })
              failedFilesCount++
            }
          } else {
            logger.warn(`Could not extract file path from URL: ${document.file_url}`)
            failedFilesCount++
          }
        }
        
        logger.info(`Storage deletion complete: ${deletedFilesCount} deleted, ${failedFilesCount} failed`)
      }

      logger.info(`Beneficiary ${id} deleted successfully${documentsCount > 0 ? ` along with ${documentsCount} associated document(s)` : ''}`)
      return NextResponse.json({
        success: true,
        message: `Beneficiary deleted successfully${documentsCount > 0 ? ` along with ${documentsCount} associated document(s)` : ''}`,
        data: deletedBeneficiary
      })
    }
    
    // Fallback: Manual deletion if RPC function doesn't exist
    // This should not happen if migration is applied, but provides safety
    logger.warn('Falling back to manual deletion - RPC function may not be available')
    
    // 3. Delete all document records from database
    if (documentsCount > 0) {
      const { error: deleteDocumentsError } = await serviceRoleClient
        .from('beneficiary_documents')
        .delete()
        .eq('beneficiary_id', id)
      
      if (deleteDocumentsError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary documents:', deleteDocumentsError)
        return NextResponse.json(
          { success: false, error: 'Failed to delete beneficiary documents' },
          { status: 500 }
        )
      } else {
        logger.info(`Deleted ${documentsCount} document record(s) from database`)
      }
    }
    
    // 4. Delete the beneficiary
    const { data: deletedDataManual, error: deleteError } = await serviceRoleClient
      .from('beneficiaries')
      .delete()
      .eq('id', id)
      .select()

    if (deleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message || 'Failed to delete beneficiary' },
        { status: 500 }
      )
    }

    if (!deletedDataManual || deletedDataManual.length === 0) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'No rows deleted - beneficiary may not exist or deletion was blocked')
      return NextResponse.json(
        { success: false, error: 'Beneficiary could not be deleted. It may not exist or may be referenced by other records.' },
        { status: 404 }
      )
    }
    
    // Storage deletion for fallback path
    if (documents && documents.length > 0) {
      const bucketName = BUCKET_NAMES.BENEFICIARIES
      const escapedBucketName = bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pathRegex = new RegExp(`${escapedBucketName}\\/(.+?)(?:\\?|$)`)
      
      let deletedFilesCount = 0
      let failedFilesCount = 0
      
      for (const document of documents) {
        if (!document.file_url) {
          logger.warn(`Document ${document.id} has no file_url, skipping storage deletion`)
          continue
        }
        
        const pathMatch = document.file_url.match(pathRegex)
        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1]
          
          try {
            const { error: storageError } = await serviceRoleClient.storage
              .from(bucketName)
              .remove([filePath])
            
            if (storageError) {
              logger.warn(`Failed to delete file from storage: ${filePath}`, { error: storageError })
              failedFilesCount++
            } else {
              deletedFilesCount++
              logger.info(`Successfully deleted file from storage: ${filePath}`)
            }
          } catch (storageErr) {
            logger.warn(`Error deleting file from storage: ${filePath}`, { error: storageErr })
            failedFilesCount++
          }
        } else {
          logger.warn(`Could not extract file path from URL: ${document.file_url}`)
          failedFilesCount++
        }
      }
      
      logger.info(`Storage deletion complete: ${deletedFilesCount} deleted, ${failedFilesCount} failed`)
    }

    logger.info(`Beneficiary ${id} deleted successfully${documentsCount > 0 ? ` along with ${documentsCount} associated document(s)` : ''}`)
    return NextResponse.json({
      success: true,
      message: `Beneficiary deleted successfully${documentsCount > 0 ? ` along with ${documentsCount} associated document(s)` : ''}`,
      data: deletedDataManual[0]
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete beneficiary' },
      { status: 500 }
    )
  }
}
