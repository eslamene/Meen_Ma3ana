/**
 * Utility functions for batch case and contribution uploads
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

export interface CSVRow {
  CaseNumber: string
  CombinedCaseNumber?: string // Format: YYYYMMNN (e.g., 20251201 for case 1 in month 12)
  CaseTitle: string
  ContributorNickname: string
  Amount: number
  Month: string
}

export interface BatchUploadSummary {
  total_items: number
  unique_cases: number // Unique case numbers (for grouping)
  distinct_cases: number // Distinct cases when considering month+caseNumber
  unique_contributors: number
  total_amount: number
  cases: Array<{
    case_number: string
    case_title: string
    item_count: number
    total_amount: number
  }>
  cases_by_month: Record<string, number> // Cases per month
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row')
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
    throw new Error('CSV must contain columns: CaseNumber, CaseTitle, ContributorNickname, Amount, Month')
  }

  const rows: CSVRow[] = []

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
          CaseNumber: cells[caseNumberIdx] || '',
          CombinedCaseNumber: combinedCaseNumberIdx >= 0 ? cells[combinedCaseNumberIdx] || '' : undefined,
          CaseTitle: cells[caseTitleIdx] || '',
          ContributorNickname: cells[contributorIdx] || '',
          Amount: amount,
          Month: cells[monthIdx] || ''
        })
      }
    }
  }

  return rows
}

/**
 * Generate summary from CSV rows
 */
export function generateSummary(rows: CSVRow[]): BatchUploadSummary {
  // Use CombinedCaseNumber if available, otherwise fall back to CaseNumber
  const uniqueCases = new Map<string, { title: string; items: CSVRow[] }>()
  const distinctCases = new Set<string>() // CombinedCaseNumber or month+caseNumber combination
  const uniqueContributors = new Set<string>()
  const casesByMonth: Record<string, Set<string>> = {} // Track unique case numbers per month
  let totalAmount = 0

  for (const row of rows) {
    // Use CombinedCaseNumber for grouping if available, otherwise use CaseNumber
    const caseKey = row.CombinedCaseNumber || row.CaseNumber
    
    // Group by case key (for database grouping)
    if (!uniqueCases.has(caseKey)) {
      uniqueCases.set(caseKey, {
        title: row.CaseTitle,
        items: []
      })
    }
    uniqueCases.get(caseKey)!.items.push(row)

    // Track distinct cases (use CombinedCaseNumber if available)
    const distinctKey = row.CombinedCaseNumber || `${row.Month}-${row.CaseNumber}`
    distinctCases.add(distinctKey)

    // Track cases per month
    if (!casesByMonth[row.Month]) {
      casesByMonth[row.Month] = new Set()
    }
    casesByMonth[row.Month].add(caseKey)

    // Track contributors
    uniqueContributors.add(row.ContributorNickname)

    // Sum amounts
    totalAmount += row.Amount
  }

  const cases = Array.from(uniqueCases.entries()).map(([caseNumber, data]) => ({
    case_number: caseNumber,
    case_title: data.title,
    item_count: data.items.length,
    total_amount: data.items.reduce((sum, item) => sum + item.Amount, 0)
  }))

  // Convert casesByMonth to counts
  const casesByMonthCounts: Record<string, number> = {}
  for (const [month, caseSet] of Object.entries(casesByMonth)) {
    casesByMonthCounts[month] = caseSet.size
  }

  return {
    total_items: rows.length,
    unique_cases: uniqueCases.size, // Unique case numbers (for grouping in database)
    distinct_cases: distinctCases.size, // Total distinct cases (month+caseNumber)
    unique_contributors: uniqueContributors.size,
    total_amount: totalAmount,
    cases,
    cases_by_month: casesByMonthCounts
  }
}

/**
 * Validate batch upload items
 */
export function validateBatchItems(items: Array<{
  case_number: string
  case_title: string
  contributor_nickname: string
  amount: number
  month: string
}>): { valid: typeof items; invalid: Array<{ item: typeof items[0]; error: string }> } {
  const valid: typeof items = []
  const invalid: Array<{ item: typeof items[0]; error: string }> = []

  for (const item of items) {
    const errors: string[] = []

    if (!item.case_number || !item.case_number.trim()) {
      errors.push('Case number is required')
    }

    if (!item.case_title || !item.case_title.trim()) {
      errors.push('Case title is required')
    }

    if (!item.contributor_nickname || !item.contributor_nickname.trim()) {
      errors.push('Contributor nickname is required')
    }

    if (!item.amount || item.amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    if (!item.month || !item.month.trim()) {
      errors.push('Month is required')
    }

    if (errors.length > 0) {
      invalid.push({
        item,
        error: errors.join('; ')
      })
    } else {
      valid.push(item)
    }
  }

  return { valid, invalid }
}

/**
 * Get service role client for batch operations
 */
export function getServiceRoleClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for batch operations')
  }

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

