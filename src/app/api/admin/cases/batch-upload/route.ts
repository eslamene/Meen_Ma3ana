import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { withApiHandler, ApiHandlerContext, createPostHandler, createGetHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import * as XLSX from 'xlsx'

interface CSVRow {
  CaseNumber?: string
  CombinedCaseNumber?: string
  CaseTitle?: string
  ContributorNickname?: string
  Amount?: number | string
  Month?: string
  [key: string]: unknown
}

interface BatchUploadResult {
  success: boolean
  batch_id: string
  total_items: number
  message?: string
}

/**
 * POST /api/admin/cases/batch-upload
 * Upload CSV file and create batch upload record with items
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger, user } = context

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch upload operations')
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
    const batchName = formData.get('name') as string || `Batch Upload - ${new Date().toLocaleString()}`

    if (!file) {
      throw new ApiError('VALIDATION_ERROR', 'No file provided', 400)
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.csv$/i)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid file type. Please upload a CSV file', 400)
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer()
    let rows: CSVRow[] = []

    // Parse CSV
    if (file.name.match(/\.csv$/i)) {
      // Parse CSV file
      const text = new TextDecoder('utf-8').decode(arrayBuffer)
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new ApiError('VALIDATION_ERROR', 'CSV file must have at least a header and one data row', 400)
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const caseNumberIdx = header.findIndex(h => h.toLowerCase().includes('casenumber') && !h.toLowerCase().includes('combined'))
      const combinedCaseNumberIdx = header.findIndex(h => h.toLowerCase().includes('combinedcasenumber'))
      const caseTitleIdx = header.findIndex(h => h.toLowerCase().includes('casetitle') || h.toLowerCase().includes('case_title'))
      const contributorIdx = header.findIndex(h => h.toLowerCase().includes('contributornickname') || h.toLowerCase().includes('contributor'))
      const amountIdx = header.findIndex(h => h.toLowerCase().includes('amount'))
      const monthIdx = header.findIndex(h => h.toLowerCase().includes('month'))

      if (caseNumberIdx === -1 || caseTitleIdx === -1 || contributorIdx === -1 || amountIdx === -1 || monthIdx === -1) {
        throw new ApiError('VALIDATION_ERROR', 'CSV must contain columns: CaseNumber, CaseTitle, ContributorNickname, Amount, Month', 400)
      }

      // Parse rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Simple CSV parsing (handles quoted values)
        const cells: string[] = []
        let currentCell = ''
        let inQuotes = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              currentCell += '"'
              j++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim())
            currentCell = ''
          } else {
            currentCell += char
          }
        }
        cells.push(currentCell.trim())

        const maxIdx = Math.max(
          caseNumberIdx,
          combinedCaseNumberIdx >= 0 ? combinedCaseNumberIdx : -1,
          caseTitleIdx,
          contributorIdx,
          amountIdx,
          monthIdx
        )
        if (cells.length >= maxIdx + 1) {
          const amount = parseFloat(cells[amountIdx]?.replace(/[^\d.-]/g, '') || '0')
          if (amount > 0) {
            rows.push({
              CaseNumber: cells[caseNumberIdx],
              CombinedCaseNumber: combinedCaseNumberIdx >= 0 ? cells[combinedCaseNumberIdx] : undefined,
              CaseTitle: cells[caseTitleIdx],
              ContributorNickname: cells[contributorIdx],
              Amount: amount,
              Month: cells[monthIdx]
            })
          }
        }
      }
    } else {
      // Try Excel parsing
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      rows = XLSX.utils.sheet_to_json<CSVRow>(worksheet, { raw: false, defval: null })
    }

    if (rows.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'No valid rows found in file', 400)
    }

    logger.info(`Processing ${rows.length} rows from file`)

    // Create batch upload record
    const { data: batchUpload, error: batchError } = await serviceRoleClient
      .from('batch_uploads')
      .insert({
        name: batchName,
        source_file: file.name,
        status: 'pending',
        total_items: rows.length,
        created_by: user.id,
        metadata: {
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (batchError || !batchUpload) {
      logger.error('Error creating batch upload:', batchError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create batch upload: ${batchError?.message || 'Unknown error'}`, 500)
    }

    // Create batch upload items
    const itemsToInsert = rows.map((row, index) => ({
      batch_id: batchUpload.id,
      row_number: index + 1,
      case_number: String(row.CombinedCaseNumber || row.CaseNumber || '').trim(),
      case_title: String(row.CaseTitle || '').trim(),
      contributor_nickname: String(row.ContributorNickname || '').trim(),
      amount: parseFloat(String(row.Amount || '0').replace(/[^\d.-]/g, '')) || 0,
      month: String(row.Month || '').trim(),
      status: 'pending'
    }))

    // Filter out invalid items
    const validItems = itemsToInsert.filter(item => 
      item.case_number && 
      item.case_title && 
      item.contributor_nickname && 
      item.amount > 0
    )

    if (validItems.length === 0) {
      // Delete the batch upload if no valid items
      await serviceRoleClient.from('batch_uploads').delete().eq('id', batchUpload.id)
      throw new ApiError('VALIDATION_ERROR', 'No valid items found in file', 400)
    }

    const { error: itemsError } = await serviceRoleClient
      .from('batch_upload_items')
      .insert(validItems)

    if (itemsError) {
      logger.error('Error creating batch upload items:', itemsError)
      // Delete the batch upload if items creation fails
      await serviceRoleClient.from('batch_uploads').delete().eq('id', batchUpload.id)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create batch items: ${itemsError.message}`, 500)
    }

    // Update batch with actual valid item count
    await serviceRoleClient
      .from('batch_uploads')
      .update({ total_items: validItems.length })
      .eq('id', batchUpload.id)

    const result: BatchUploadResult = {
      success: true,
      batch_id: batchUpload.id,
      total_items: validItems.length,
      message: `Successfully uploaded ${validItems.length} items. ${rows.length - validItems.length} items were skipped.`
    }

    logger.info(`Batch upload created: ${batchUpload.id} with ${validItems.length} items`)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error in batch upload:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred during batch upload', 500)
  }
}

/**
 * GET /api/admin/cases/batch-upload
 * List batch uploads
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('batch_uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching batch uploads:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch batch uploads', 500)
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    total: data?.length || 0
  })
}

export const POST = createPostHandler(postHandler, { 
  requireAuth: true,
  requirePermissions: ['cases:batch_upload']
})
export const GET = createGetHandler(getHandler, { 
  requireAuth: true,
  requirePermissions: ['cases:batch_upload']
})

