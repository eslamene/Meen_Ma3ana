import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { withApiHandler, ApiHandlerContext, createPostHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import * as XLSX from 'xlsx'

interface ExcelRow {
  name?: string
  name_ar?: string
  age?: number | string
  gender?: 'male' | 'female' | 'other' | string
  mobile_number?: string
  additional_mobile_number?: string
  email?: string
  alternative_contact?: string
  national_id?: string
  id_type?: string
  address?: string
  city?: string
  governorate?: string
  country?: string
  medical_condition?: string
  social_situation?: string
  family_size?: number | string
  dependents?: number | string
  notes?: string
  tags?: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical' | string
  [key: string]: unknown
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface UploadResult {
  success: boolean
  total: number
  created: number
  skipped: number
  errors: ValidationError[]
  message?: string
}

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger, user } = context

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

  try {
    // Get the file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'No file provided', 400)
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file', 400)
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { 
      raw: false,
      defval: null 
    })

    if (rows.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Excel file is empty', 400)
    }

    logger.info(`Processing ${rows.length} rows from Excel file`)

    // Validate and transform rows
    const validationErrors: ValidationError[] = []
    const validRows: Record<string, unknown>[] = []
    const skippedRows: number[] = []

    // Get lookup data
    const [citiesResult, idTypesResult] = await Promise.all([
      serviceRoleClient.from('cities').select('id, code, name_en, name_ar'),
      serviceRoleClient.from('id_types').select('id, code, name_en, name_ar')
    ])

    const cities = citiesResult.data || []
    const idTypes = idTypesResult.data || []

    // Create lookup maps
    const cityMap = new Map(cities.map(c => [c.code?.toLowerCase() || c.name_en?.toLowerCase(), c.id]))
    const idTypeMap = new Map(idTypes.map(t => [t.code?.toLowerCase() || t.name_en?.toLowerCase(), t.id]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because Excel rows start at 1 and we have header

      // Required fields validation
      if (!row.name || !row.name.trim()) {
        validationErrors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name is required'
        })
        skippedRows.push(rowNumber)
        continue
      }

      // At least one identifier required
      if (!row.mobile_number && !row.national_id) {
        validationErrors.push({
          row: rowNumber,
          field: 'mobile_number',
          message: 'Either mobile_number or national_id is required'
        })
        skippedRows.push(rowNumber)
        continue
      }

      // Check for duplicates in current batch
      const isDuplicate = validRows.some(vr => 
        (vr.mobile_number && row.mobile_number && vr.mobile_number === row.mobile_number) ||
        (vr.national_id && row.national_id && vr.national_id === row.national_id)
      )

      if (isDuplicate) {
        validationErrors.push({
          row: rowNumber,
          field: 'mobile_number',
          message: 'Duplicate entry in this file'
        })
        skippedRows.push(rowNumber)
        continue
      }

      // Check if beneficiary already exists in database
      let existingQuery = serviceRoleClient
        .from('beneficiaries')
        .select('id')
        .limit(1)

      if (row.mobile_number && row.national_id) {
        existingQuery = existingQuery.or(`mobile_number.eq.${row.mobile_number},national_id.eq.${row.national_id}`)
      } else if (row.mobile_number) {
        existingQuery = existingQuery.eq('mobile_number', row.mobile_number)
      } else if (row.national_id) {
        existingQuery = existingQuery.eq('national_id', row.national_id)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        validationErrors.push({
          row: rowNumber,
          field: 'mobile_number',
          message: 'Beneficiary already exists in database'
        })
        skippedRows.push(rowNumber)
        continue
      }

      // Transform row data
      const beneficiaryData: Record<string, unknown> = {
        name: row.name.trim(),
        name_ar: row.name_ar?.trim() || null,
        mobile_number: row.mobile_number?.trim() || null,
        additional_mobile_number: row.additional_mobile_number?.trim() || null,
        email: row.email?.trim() || null,
        alternative_contact: row.alternative_contact?.trim() || null,
        national_id: row.national_id?.trim() || null,
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        governorate: row.governorate?.trim() || null,
        country: row.country?.trim() || 'Egypt',
        medical_condition: row.medical_condition?.trim() || null,
        social_situation: row.social_situation?.trim() || null,
        notes: row.notes?.trim() || null,
        created_by: user.id,
      }

      // Handle age
      if (row.age) {
        const age = typeof row.age === 'string' ? parseInt(row.age) : row.age
        if (!isNaN(age) && age > 0) {
          beneficiaryData.age = age
        }
      }

      // Handle gender
      if (row.gender) {
        const gender = row.gender.toLowerCase().trim()
        if (['male', 'female', 'other'].includes(gender)) {
          beneficiaryData.gender = gender
        }
      }

      // Handle id_type
      if (row.id_type) {
        const idTypeKey = row.id_type.toLowerCase().trim()
        const idTypeId = idTypeMap.get(idTypeKey)
        if (idTypeId) {
          beneficiaryData.id_type_id = idTypeId
        }
        beneficiaryData.id_type = idTypeKey
      }

      // Handle city_id lookup
      if (row.city) {
        const cityKey = row.city.toLowerCase().trim()
        const cityId = cityMap.get(cityKey)
        if (cityId) {
          beneficiaryData.city_id = cityId
        }
      }

      // Handle family_size
      if (row.family_size) {
        const familySize = typeof row.family_size === 'string' ? parseInt(row.family_size) : row.family_size
        if (!isNaN(familySize) && familySize > 0) {
          beneficiaryData.family_size = familySize
        }
      }

      // Handle dependents
      if (row.dependents) {
        const dependents = typeof row.dependents === 'string' ? parseInt(row.dependents) : row.dependents
        if (!isNaN(dependents) && dependents >= 0) {
          beneficiaryData.dependents = dependents
        }
      }

      // Handle tags (comma-separated string)
      if (row.tags) {
        const tags = row.tags.split(',').map(t => t.trim()).filter(t => t)
        if (tags.length > 0) {
          beneficiaryData.tags = tags
        }
      }

      // Handle risk_level
      if (row.risk_level) {
        const riskLevel = row.risk_level.toLowerCase().trim()
        if (['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
          beneficiaryData.risk_level = riskLevel
        }
      }

      // Remove undefined values
      Object.keys(beneficiaryData).forEach(key => {
        if (beneficiaryData[key] === undefined || beneficiaryData[key] === '') {
          delete beneficiaryData[key]
        }
      })

      validRows.push(beneficiaryData)
    }

    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        total: rows.length,
        created: 0,
        skipped: skippedRows.length,
        errors: validationErrors,
        message: 'No valid rows to import'
      } as UploadResult, { status: 400 })
    }

    // Bulk insert valid rows
    const { data: inserted, error: insertError } = await serviceRoleClient
      .from('beneficiaries')
      .insert(validRows)
      .select()

    if (insertError) {
      logger.error('Error bulk inserting beneficiaries:', insertError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to insert beneficiaries: ${insertError.message}`, 500)
    }

    const result: UploadResult = {
      success: true,
      total: rows.length,
      created: inserted?.length || 0,
      skipped: skippedRows.length,
      errors: validationErrors,
      message: `Successfully imported ${inserted?.length || 0} beneficiaries. ${skippedRows.length} rows were skipped.`
    }

    logger.info(`Bulk upload completed: ${result.created} created, ${result.skipped} skipped`)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error in bulk upload:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred during bulk upload', 500)
  }
}

export const POST = createPostHandler(postHandler, { 
  loggerContext: 'api/beneficiaries/bulk-upload',
  requireAuth: true 
})

