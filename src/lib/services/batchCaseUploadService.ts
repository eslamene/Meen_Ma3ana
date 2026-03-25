/**
 * Admin batch case upload: create batches, map nicknames, process, delete.
 * Uses a Supabase service-role client for writes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { defaultLogger } from '@/lib/logger'

export interface BatchCSVRow {
  CaseNumber?: string
  CombinedCaseNumber?: string
  CaseTitle?: string
  ContributorNickname?: string
  Amount?: number | string
  Month?: string
  [key: string]: unknown
}

export interface BatchUploadCreateResult {
  success: boolean
  batch_id: string
  total_items: number
  message?: string
}

export interface NicknameMapping {
  nickname: string
  user_id: string
}

function getField(item: Record<string, unknown>, field: string): unknown {
  return (
    item[field] ||
    item[field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] ||
    null
  )
}

export class BatchCaseUploadService {
  /**
   * Parse CSV or first-sheet XLSX into normalized rows (same rules as legacy route).
   */
  static async parseUploadFile(file: File, arrayBuffer: ArrayBuffer): Promise<BatchCSVRow[]> {
    let rows: BatchCSVRow[] = []

    if (file.name.match(/\.csv$/i)) {
      const text = new TextDecoder('utf-8').decode(arrayBuffer)
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        throw new Error('CSV_FILE_TOO_SHORT')
      }

      const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const caseNumberIdx = header.findIndex(
        h => h.toLowerCase().includes('casenumber') && !h.toLowerCase().includes('combined')
      )
      const combinedCaseNumberIdx = header.findIndex(h =>
        h.toLowerCase().includes('combinedcasenumber')
      )
      const caseTitleIdx = header.findIndex(
        h => h.toLowerCase().includes('casetitle') || h.toLowerCase().includes('case_title')
      )
      const contributorIdx = header.findIndex(
        h =>
          h.toLowerCase().includes('contributornickname') || h.toLowerCase().includes('contributor')
      )
      const amountIdx = header.findIndex(h => h.toLowerCase().includes('amount'))
      const monthIdx = header.findIndex(h => h.toLowerCase().includes('month'))

      if (
        caseNumberIdx === -1 ||
        caseTitleIdx === -1 ||
        contributorIdx === -1 ||
        amountIdx === -1 ||
        monthIdx === -1
      ) {
        throw new Error('CSV_MISSING_COLUMNS')
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) {
          continue
        }

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
              CombinedCaseNumber:
                combinedCaseNumberIdx >= 0 ? cells[combinedCaseNumberIdx] : undefined,
              CaseTitle: cells[caseTitleIdx],
              ContributorNickname: cells[contributorIdx],
              Amount: amount,
              Month: cells[monthIdx],
            })
          }
        }
      }
    } else {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      rows = XLSX.utils.sheet_to_json<BatchCSVRow>(worksheet, { raw: false, defval: null })
    }

    return rows
  }

  static async createUploadFromRows(
    serviceRole: SupabaseClient,
    params: {
      createdBy: string
      batchName: string
      sourceFileName: string
      fileSize: number
      fileType: string
      rows: BatchCSVRow[]
    }
  ): Promise<BatchUploadCreateResult> {
    const { createdBy, batchName, sourceFileName, fileSize, fileType, rows } = params

    if (rows.length === 0) {
      throw new Error('NO_VALID_ROWS')
    }

    const { data: batchUpload, error: batchError } = await serviceRole
      .from('batch_uploads')
      .insert({
        name: batchName,
        source_file: sourceFileName,
        status: 'pending',
        total_items: rows.length,
        created_by: createdBy,
        metadata: {
          file_size: fileSize,
          file_type: fileType,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (batchError || !batchUpload) {
      defaultLogger.error('Error creating batch upload:', batchError)
      throw new Error(batchError?.message || 'BATCH_CREATE_FAILED')
    }

    const itemsToInsert = rows.map((row, index) => ({
      batch_id: batchUpload.id,
      row_number: index + 1,
      case_number: String(row.CombinedCaseNumber || row.CaseNumber || '').trim(),
      case_title: String(row.CaseTitle || '').trim(),
      contributor_nickname: String(row.ContributorNickname || '').trim(),
      amount: parseFloat(String(row.Amount || '0').replace(/[^\d.-]/g, '')) || 0,
      month: String(row.Month || '').trim(),
      status: 'pending',
    }))

    const validItems = itemsToInsert.filter(
      item =>
        item.case_number &&
        item.case_title &&
        item.contributor_nickname &&
        item.amount > 0
    )

    if (validItems.length === 0) {
      await serviceRole.from('batch_uploads').delete().eq('id', batchUpload.id)
      throw new Error('NO_VALID_ITEMS')
    }

    const { error: itemsError } = await serviceRole.from('batch_upload_items').insert(validItems)

    if (itemsError) {
      defaultLogger.error('Error creating batch upload items:', itemsError)
      await serviceRole.from('batch_uploads').delete().eq('id', batchUpload.id)
      throw new Error(itemsError.message)
    }

    await serviceRole
      .from('batch_uploads')
      .update({ total_items: validItems.length })
      .eq('id', batchUpload.id)

    return {
      success: true,
      batch_id: batchUpload.id,
      total_items: validItems.length,
      message: `Successfully uploaded ${validItems.length} items. ${rows.length - validItems.length} items were skipped.`,
    }
  }

  static async listUploads(
    supabase: SupabaseClient,
    opts: { status?: string | null; limit: number; offset: number }
  ) {
    let query = supabase
      .from('batch_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(opts.offset, opts.offset + opts.limit - 1)

    if (opts.status) {
      query = query.eq('status', opts.status)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(error.message)
    }

    return { data: data || [], total: data?.length || 0 }
  }

  static async getBatchDetail(serviceRole: SupabaseClient, batchId: string) {
    const { data: batch, error: batchError } = await serviceRole
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError) {
      if (batchError.code === 'PGRST116') {
        throw new Error('NOT_FOUND')
      }
      throw new Error(batchError.message)
    }
    if (!batch) {
      throw new Error('NOT_FOUND')
    }

    const { data: items, error: itemsError } = await serviceRole
      .from('batch_upload_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true })

    if (itemsError) {
      throw new Error(itemsError.message)
    }

    const list = items || []
    const uniqueNicknames = Array.from(
      new Set(
        list
          .map(item => {
            const row = item as Record<string, unknown>
            return (
              (row.contributor_nickname as string) ||
              (row.contributorNickname as string) ||
              ''
            )
          })
          .filter(Boolean)
      )
    )

    return {
      batch,
      items: list,
      unique_nicknames: uniqueNicknames,
      summary: {
        total: list.length,
        pending: list.filter(i => getField(i as Record<string, unknown>, 'status') === 'pending')
          .length,
        mapped: list.filter(
          i =>
            getField(i as Record<string, unknown>, 'status') === 'mapped' ||
            getField(i as Record<string, unknown>, 'user_id')
        ).length,
        case_created: list.filter(
          i =>
            getField(i as Record<string, unknown>, 'status') === 'case_created' ||
            getField(i as Record<string, unknown>, 'case_id')
        ).length,
        contribution_created: list.filter(
          i =>
            getField(i as Record<string, unknown>, 'status') === 'contribution_created' ||
            getField(i as Record<string, unknown>, 'contribution_id')
        ).length,
        failed: list.filter(i => getField(i as Record<string, unknown>, 'status') === 'failed')
          .length,
      },
    }
  }

  static async applyNicknameMappings(
    serviceRole: SupabaseClient,
    batchId: string,
    mappings: NicknameMapping[]
  ) {
    const { data: batch, error: batchError } = await serviceRole
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      throw new Error('BATCH_NOT_FOUND')
    }

    if (batch.status !== 'pending') {
      throw new Error('BATCH_NOT_PENDING')
    }

    let updatedCount = 0
    const errors: string[] = []

    for (const mapping of mappings) {
      if (!mapping.nickname) {
        errors.push(`Invalid mapping: nickname is required`)
        continue
      }

      if (!mapping.user_id) {
        const { error: updateError } = await serviceRole
          .from('batch_upload_items')
          .update({
            user_id: null,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('batch_id', batchId)
          .eq('contributor_nickname', mapping.nickname)

        if (updateError) {
          errors.push(`Failed to clear mapping for nickname ${mapping.nickname}: ${updateError.message}`)
        } else {
          updatedCount++
        }
        continue
      }

      const { data: userData } = await serviceRole
        .from('users')
        .select('id')
        .eq('id', mapping.user_id)
        .single()

      if (!userData) {
        errors.push(`User not found: ${mapping.user_id}`)
        continue
      }

      const { error: updateError } = await serviceRole
        .from('batch_upload_items')
        .update({
          user_id: mapping.user_id,
          status: 'mapped',
          updated_at: new Date().toISOString(),
        })
        .eq('batch_id', batchId)
        .eq('contributor_nickname', mapping.nickname)

      if (updateError) {
        errors.push(`Failed to update items for nickname ${mapping.nickname}: ${updateError.message}`)
      } else {
        updatedCount++
      }
    }

    return {
      updated_count: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Mapped ${updatedCount} nickname(s)${errors.length > 0 ? `. ${errors.length} error(s) occurred.` : ''}`,
    }
  }

  static async processBatch(
    serviceRole: SupabaseClient,
    batchId: string,
    adminUserId: string,
    logger = defaultLogger
  ) {
    const { data: batch, error: batchError } = await serviceRole
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      throw new Error('BATCH_NOT_FOUND')
    }

    if (batch.status === 'processing') {
      throw new Error('ALREADY_PROCESSING')
    }

    if (batch.status === 'completed') {
      throw new Error('ALREADY_COMPLETED')
    }

    await serviceRole
      .from('batch_uploads')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', batchId)

    const { data: items, error: itemsError } = await serviceRole
      .from('batch_upload_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true })

    if (itemsError || !items || items.length === 0) {
      await serviceRole
        .from('batch_uploads')
        .update({ status: 'failed', error_summary: { message: 'No items found' } })
        .eq('id', batchId)
      throw new Error('NO_ITEMS')
    }

    const unmappedItems = items.filter(item => !item.user_id || item.status === 'pending')
    if (unmappedItems.length > 0) {
      await serviceRole
        .from('batch_uploads')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', batchId)
      throw new Error(`UNMAPPED:${unmappedItems.length}`)
    }

    const casesMap = new Map<string, typeof items>()
    for (const item of items) {
      if (!item.case_number) {
        continue
      }
      if (!casesMap.has(item.case_number)) {
        casesMap.set(item.case_number, [])
      }
      casesMap.get(item.case_number)!.push(item)
    }

    let processedItems = 0
    let successfulItems = 0
    let failedItems = 0
    const errors: Array<{ item_id: string; error: string }> = []

    const { data: paymentMethods } = await serviceRole
      .from('payment_methods')
      .select('id')
      .eq('code', 'cash')
      .limit(1)

    const paymentMethodId = paymentMethods?.[0]?.id
    if (!paymentMethodId) {
      throw new Error('NO_CASH_PAYMENT_METHOD')
    }

    for (const [caseNumber, caseItems] of casesMap.entries()) {
      try {
        const firstItem = caseItems[0]
        if (!firstItem) {
          continue
        }

        let caseId = firstItem.case_id

        if (!caseId) {
          const { data: newCase, error: caseError } = await serviceRole
            .from('cases')
            .insert({
              title_ar: firstItem.case_title,
              title_en: firstItem.case_title,
              description_ar: `Case imported from batch upload - Month ${firstItem.month}`,
              description_en: `Case imported from batch upload - Month ${firstItem.month}`,
              type: 'one-time',
              priority: 'medium',
              target_amount: caseItems.reduce(
                (sum, item) => sum + parseFloat(String(item.amount || 0)),
                0
              ),
              current_amount: 0,
              status: 'draft',
              created_by: adminUserId,
              batch_id: batchId,
            })
            .select()
            .single()

          if (caseError || !newCase) {
            throw new Error(`Failed to create case: ${caseError?.message || 'Unknown error'}`)
          }

          caseId = newCase.id

          await serviceRole
            .from('batch_upload_items')
            .update({
              case_id: caseId,
              status: 'case_created',
              updated_at: new Date().toISOString(),
            })
            .eq('batch_id', batchId)
            .eq('case_number', caseNumber)
        }

        for (const item of caseItems) {
          try {
            if (!item.user_id) {
              errors.push({ item_id: item.id, error: 'No user mapped for this contribution' })
              failedItems++
              continue
            }

            const { data: contribution, error: contribError } = await serviceRole
              .from('contributions')
              .insert({
                type: 'donation',
                amount: String(item.amount),
                payment_method_id: paymentMethodId,
                status: 'pending',
                donor_id: item.user_id,
                case_id: caseId,
                batch_id: batchId,
                notes: `Imported from batch upload - Month ${item.month}`,
              })
              .select()
              .single()

            if (contribError || !contribution) {
              throw new Error(`Failed to create contribution: ${contribError?.message || 'Unknown error'}`)
            }

            await serviceRole
              .from('batch_upload_items')
              .update({
                contribution_id: contribution.id,
                status: 'contribution_created',
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id)

            successfulItems++
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            errors.push({ item_id: item.id, error: errorMsg })

            await serviceRole
              .from('batch_upload_items')
              .update({
                status: 'failed',
                error_message: errorMsg,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id)

            failedItems++
          }

          processedItems++
        }

        const totalAmount = caseItems
          .filter(item => item.contribution_id)
          .reduce((sum, item) => sum + parseFloat(String(item.amount || 0)), 0)

        if (caseId && totalAmount > 0) {
          await serviceRole
            .from('cases')
            .update({ current_amount: String(totalAmount) })
            .eq('id', caseId)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Error processing case ${caseNumber}:`, error)

        for (const item of caseItems) {
          errors.push({ item_id: item.id, error: `Case creation failed: ${errorMsg}` })
          await serviceRole
            .from('batch_upload_items')
            .update({
              status: 'failed',
              error_message: errorMsg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
          failedItems++
          processedItems++
        }
      }
    }

    const finalStatus =
      failedItems === 0 ? 'completed' : successfulItems > 0 ? 'completed' : 'failed'

    await serviceRole
      .from('batch_uploads')
      .update({
        status: finalStatus,
        processed_items: processedItems,
        successful_items: successfulItems,
        failed_items: failedItems,
        error_summary: errors.length > 0 ? { errors, total_errors: errors.length } : null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)

    return {
      processed_items: processedItems,
      successful_items: successfulItems,
      failed_items: failedItems,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${processedItems} items. ${successfulItems} successful, ${failedItems} failed.`,
    }
  }

  static async deleteBatchCascade(serviceRole: SupabaseClient, batchId: string, logger = defaultLogger) {
    const { data: batch, error: batchError } = await serviceRole
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      throw new Error('NOT_FOUND')
    }

    logger.info(`Batch found: ${batch.name || batchId}, Status: ${batch.status}`)

    const { data: contributions, error: contribFetchError } = await serviceRole
      .from('contributions')
      .select('id')
      .eq('batch_id', batchId)

    if (contribFetchError) {
      throw new Error(contribFetchError.message)
    }

    const contributionIds = contributions?.map(c => c.id) || []

    if (contributionIds.length > 0) {
      const { error: contribError } = await serviceRole.from('contributions').delete().eq('batch_id', batchId)
      if (contribError) {
        throw new Error(contribError.message)
      }
    }

    const { data: casesData, error: casesFetchError } = await serviceRole
      .from('cases')
      .select('id')
      .eq('batch_id', batchId)

    if (casesFetchError) {
      throw new Error(casesFetchError.message)
    }

    const caseIds = casesData?.map(c => c.id) || []

    if (caseIds.length > 0) {
      const { error: caseError } = await serviceRole.from('cases').delete().eq('batch_id', batchId)
      if (caseError) {
        throw new Error(caseError.message)
      }
    }

    const { error: itemsResetError } = await serviceRole
      .from('batch_upload_items')
      .update({
        status: 'pending',
        case_id: null,
        contribution_id: null,
        user_id: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)

    if (itemsResetError) {
      throw new Error(itemsResetError.message)
    }

    const { error: deleteItemsError } = await serviceRole
      .from('batch_upload_items')
      .delete()
      .eq('batch_id', batchId)

    if (deleteItemsError) {
      throw new Error(deleteItemsError.message)
    }

    const { error: deleteBatchError } = await serviceRole.from('batch_uploads').delete().eq('id', batchId)

    if (deleteBatchError) {
      throw new Error(deleteBatchError.message)
    }

    return {
      cases: caseIds.length,
      contributions: contributionIds.length,
    }
  }
}
