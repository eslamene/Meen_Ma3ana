/**
 * Beneficiary bulk import from parsed Excel/CSV rows (service role client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '@/lib/logger'

export interface ExcelRow {
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

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface UploadResult {
  success: boolean
  total: number
  created: number
  skipped: number
  errors: ValidationError[]
  message?: string
}

export class BeneficiaryBulkUploadService {
  static async execute(
    serviceRoleClient: SupabaseClient,
    rows: ExcelRow[],
    userId: string,
    logger: Logger
  ): Promise<UploadResult> {
    const validationErrors: ValidationError[] = []
    const validRows: Record<string, unknown>[] = []
    const skippedRows: number[] = []

    const [citiesResult, idTypesResult] = await Promise.all([
      serviceRoleClient.from('cities').select('id, code, name_en, name_ar'),
      serviceRoleClient.from('id_types').select('id, code, name_en, name_ar'),
    ])

    const cities = citiesResult.data || []
    const idTypes = idTypesResult.data || []

    const cityMap = new Map(
      cities.map((c: { code?: string; name_en?: string; id: string }) => [
        c.code?.toLowerCase() || c.name_en?.toLowerCase(),
        c.id,
      ])
    )
    const idTypeMap = new Map(
      idTypes.map((t: { code?: string; name_en?: string; id: string }) => [
        t.code?.toLowerCase() || t.name_en?.toLowerCase(),
        t.id,
      ])
    )

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2

      if (!row.name || !row.name.trim()) {
        validationErrors.push({ row: rowNumber, field: 'name', message: 'Name is required' })
        skippedRows.push(rowNumber)
        continue
      }

      if (!row.mobile_number && !row.national_id) {
        validationErrors.push({
          row: rowNumber,
          field: 'mobile_number',
          message: 'Either mobile_number or national_id is required',
        })
        skippedRows.push(rowNumber)
        continue
      }

      const isDuplicate = validRows.some(
        (vr) =>
          (vr.mobile_number && row.mobile_number && vr.mobile_number === row.mobile_number) ||
          (vr.national_id && row.national_id && vr.national_id === row.national_id)
      )

      if (isDuplicate) {
        validationErrors.push({
          row: rowNumber,
          field: 'mobile_number',
          message: 'Duplicate entry in this file',
        })
        skippedRows.push(rowNumber)
        continue
      }

      let existingQuery = serviceRoleClient.from('beneficiaries').select('id').limit(1)

      if (row.mobile_number && row.national_id) {
        existingQuery = existingQuery.or(
          `mobile_number.eq.${row.mobile_number},national_id.eq.${row.national_id}`
        )
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
          message: 'Beneficiary already exists in database',
        })
        skippedRows.push(rowNumber)
        continue
      }

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
        created_by: userId,
      }

      if (row.age) {
        const age = typeof row.age === 'string' ? parseInt(row.age, 10) : row.age
        if (!isNaN(Number(age)) && Number(age) > 0) {
          beneficiaryData.age = age
        }
      }

      if (row.gender) {
        const gender = row.gender.toLowerCase().trim()
        if (['male', 'female', 'other'].includes(gender)) {
          beneficiaryData.gender = gender
        }
      }

      if (row.id_type) {
        const idTypeKey = row.id_type.toLowerCase().trim()
        const idTypeId = idTypeMap.get(idTypeKey)
        if (idTypeId) {
          beneficiaryData.id_type_id = idTypeId
        }
        beneficiaryData.id_type = idTypeKey
      }

      if (row.city) {
        const cityKey = row.city.toLowerCase().trim()
        const cityId = cityMap.get(cityKey)
        if (cityId) {
          beneficiaryData.city_id = cityId
        }
      }

      if (row.family_size) {
        const familySize =
          typeof row.family_size === 'string' ? parseInt(row.family_size, 10) : row.family_size
        if (!isNaN(Number(familySize)) && Number(familySize) > 0) {
          beneficiaryData.family_size = familySize
        }
      }

      if (row.dependents) {
        const dependents =
          typeof row.dependents === 'string' ? parseInt(row.dependents, 10) : row.dependents
        if (!isNaN(Number(dependents)) && Number(dependents) >= 0) {
          beneficiaryData.dependents = dependents
        }
      }

      if (row.tags) {
        const tags = row.tags.split(',').map((t) => t.trim()).filter(Boolean)
        if (tags.length > 0) {
          beneficiaryData.tags = tags
        }
      }

      if (row.risk_level) {
        const riskLevel = row.risk_level.toLowerCase().trim()
        if (['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
          beneficiaryData.risk_level = riskLevel
        }
      }

      Object.keys(beneficiaryData).forEach((key) => {
        if (beneficiaryData[key] === undefined || beneficiaryData[key] === '') {
          delete beneficiaryData[key]
        }
      })

      validRows.push(beneficiaryData)
    }

    if (validRows.length === 0) {
      return {
        success: false,
        total: rows.length,
        created: 0,
        skipped: skippedRows.length,
        errors: validationErrors,
        message: 'No valid rows to import',
      }
    }

    const { data: inserted, error: insertError } = await serviceRoleClient
      .from('beneficiaries')
      .insert(validRows)
      .select()

    if (insertError) {
      logger.error('Error bulk inserting beneficiaries:', insertError)
      throw new Error(`Failed to insert beneficiaries: ${insertError.message}`)
    }

    return {
      success: true,
      total: rows.length,
      created: inserted?.length || 0,
      skipped: skippedRows.length,
      errors: validationErrors,
      message: `Successfully imported ${inserted?.length || 0} beneficiaries. ${skippedRows.length} rows were skipped.`,
    }
  }
}
