/**
 * Bulk approve/reject pending contributions (admin).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '@/lib/logger'

export interface BatchContributionBody {
  ids?: string[]
  action: 'approve' | 'reject'
  reason?: string
  selectMode?: string
  filters?: Record<string, string | undefined>
}

export interface BatchContributionResult {
  success: number
  failed: number
  total: number
  errors?: Array<{ id: string; error: string }>
  updatedContributions: Array<{
    id: string
    case_id: string | null
    amount: string | number | null
    donor_id: string | null
    cases?: unknown
  }>
}

export class ContributionBatchService {
  static async processBatch(
    supabase: SupabaseClient,
    adminUserId: string,
    body: BatchContributionBody,
    logger: Logger
  ): Promise<BatchContributionResult> {
    const { ids, action, reason, selectMode, filters } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      throw new Error('VALIDATION: action must be either "approve" or "reject"')
    }

    if (action === 'reject' && !reason) {
      throw new Error('VALIDATION: reason is required when rejecting contributions')
    }

    let contributionsQuery = supabase.from('contributions').select(`
      id,
      amount,
      donor_id,
      case_id,
      status,
      cases(title_en, title_ar),
      users!donor_id(first_name, last_name, email)
    `)

    if (selectMode === 'all') {
      contributionsQuery = contributionsQuery.eq('status', 'pending')
    } else if (selectMode === 'searched' && filters) {
      contributionsQuery = contributionsQuery.eq('status', 'pending')
      if (filters.dateFrom) {
        contributionsQuery = contributionsQuery.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        contributionsQuery = contributionsQuery.lte('created_at', filters.dateTo)
      }
      if (filters.amountMin) {
        contributionsQuery = contributionsQuery.gte('amount', filters.amountMin)
      }
      if (filters.amountMax) {
        contributionsQuery = contributionsQuery.lte('amount', filters.amountMax)
      }
      if (filters.paymentMethod) {
        contributionsQuery = contributionsQuery.eq('payment_method', filters.paymentMethod)
      }
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      contributionsQuery = contributionsQuery.in('id', ids).eq('status', 'pending')
    } else if (ids && Array.isArray(ids) && ids.length === 0) {
      throw new Error(
        'VALIDATION: IDs array cannot be empty. Please select at least one contribution.'
      )
    } else {
      throw new Error('VALIDATION: Either ids array (with at least one ID) or selectMode must be provided')
    }

    const { data: contributions, error: fetchError } = await contributionsQuery

    if (fetchError) {
      logger.error('Error fetching contributions:', fetchError)
      throw new Error(`Failed to fetch contributions: ${fetchError.message}`)
    }

    let filteredContributions = (contributions || []) as Array<Record<string, unknown> & { status?: string }>
    filteredContributions = filteredContributions.filter((c) => c.status === 'pending')

    if (selectMode === 'searched' && filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredContributions = filteredContributions.filter((c) => {
          const caseData = Array.isArray(c.cases) ? c.cases[0] : c.cases
          const caseDataObj = caseData as { title_en?: string; title_ar?: string } | undefined
          const caseTitle = caseDataObj?.title_en || caseDataObj?.title_ar || ''
          const amount = String(c.amount || '')
          return caseTitle.toLowerCase().includes(searchLower) || amount.includes(searchLower)
        })
      }
      if (filters.donorName) {
        const donorNameLower = filters.donorName.toLowerCase()
        filteredContributions = filteredContributions.filter((c) => {
          const userData = Array.isArray(c.users) ? c.users[0] : c.users
          const u = userData as { first_name?: string; last_name?: string } | undefined
          const firstName = u?.first_name || ''
          const lastName = u?.last_name || ''
          const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
          return fullName.includes(donorNameLower)
        })
      }
    }

    if (!filteredContributions || filteredContributions.length === 0) {
      throw new Error('VALIDATION: No pending contributions found to process')
    }

    const totalContributions = filteredContributions.length
    const contributionIds = filteredContributions.map((c) => c.id as string)

    const { data: existingApprovalStatuses } = await supabase
      .from('contribution_approval_status')
      .select('contribution_id, status, resubmission_count')
      .in('contribution_id', contributionIds)

    const approvalStatusMap = new Map(
      (existingApprovalStatuses || []).map((status: Record<string, unknown>) => [
        status.contribution_id as string,
        status,
      ])
    )

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (action === 'reject' && reason) {
      updateData.notes = reason
    }

    const { data: updatedContributions, error: contributionsUpdateError } = await supabase
      .from('contributions')
      .update(updateData)
      .in('id', contributionIds)
      .select(
        `
        id, 
        case_id, 
        amount, 
        donor_id,
        cases(title_en, title_ar)
      `
      )

    if (contributionsUpdateError) {
      logger.error('Error bulk updating contributions:', contributionsUpdateError)
      throw new Error(`Failed to update contributions: ${contributionsUpdateError.message}`)
    }

    const updated = (updatedContributions || []) as BatchContributionResult['updatedContributions']
    const updatedIds = new Set(updated.map((c) => c.id))
    const successCount = updatedIds.size
    const failedIds = contributionIds.filter((id) => !updatedIds.has(id))
    const errors: Array<{ id: string; error: string }> = failedIds.map((id) => ({
      id,
      error: 'Failed to update contribution status',
    }))

    const approvalStatusUpdates: Array<{
      contribution_id: string
      status: string
      admin_id: string
      rejection_reason?: string
      resubmission_count: number
      updated_at: string
    }> = []

    const approvalStatusInserts: Array<{
      contribution_id: string
      status: string
      admin_id: string
      rejection_reason?: string
      resubmission_count: number
    }> = []

    for (const contributionId of updatedIds) {
      const existingStatus = approvalStatusMap.get(contributionId) as
        | { resubmission_count?: number }
        | undefined

      if (existingStatus) {
        approvalStatusUpdates.push({
          contribution_id: contributionId,
          status: newStatus,
          admin_id: adminUserId,
          ...(action === 'reject' && reason ? { rejection_reason: reason } : {}),
          resubmission_count:
            action === 'reject'
              ? (existingStatus.resubmission_count || 0) + 1
              : existingStatus.resubmission_count || 0,
          updated_at: new Date().toISOString(),
        })
      } else {
        approvalStatusInserts.push({
          contribution_id: contributionId,
          status: newStatus,
          admin_id: adminUserId,
          ...(action === 'reject' && reason ? { rejection_reason: reason } : {}),
          resubmission_count: 0,
        })
      }
    }

    if (approvalStatusUpdates.length > 0) {
      const updatePromises = approvalStatusUpdates.map((update) =>
        supabase
          .from('contribution_approval_status')
          .update({
            status: update.status,
            admin_id: update.admin_id,
            ...(update.rejection_reason ? { rejection_reason: update.rejection_reason } : {}),
            resubmission_count: update.resubmission_count,
            updated_at: update.updated_at,
          })
          .eq('contribution_id', update.contribution_id)
      )

      const updateResults = await Promise.allSettled(updatePromises)
      updateResults.forEach((result, index) => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
          const contributionId = approvalStatusUpdates[index].contribution_id
          logger.warn(`Error updating approval status for contribution ${contributionId}`)
        }
      })
    }

    if (approvalStatusInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('contribution_approval_status')
        .insert(approvalStatusInserts)

      if (insertError) {
        logger.error('Error bulk inserting approval statuses:', insertError)
      }
    }

    const caseAmountUpdates = new Map<string, number>()
    if (action === 'approve' && updatedContributions) {
      for (const contribution of updated) {
        if (contribution.case_id) {
          const caseId = contribution.case_id
          const amount = parseFloat(String(contribution.amount || '0'))
          caseAmountUpdates.set(caseId, (caseAmountUpdates.get(caseId) || 0) + amount)
        }
      }
    }

    if (action === 'approve' && caseAmountUpdates.size > 0) {
      const caseIds = Array.from(caseAmountUpdates.keys())
      const { data: casesData } = await supabase
        .from('cases')
        .select('id, current_amount')
        .in('id', caseIds)

      if (casesData) {
        const caseUpdatePromises = casesData.map(
          (caseData: { id: string; current_amount?: string | null }) => {
            const currentAmount = parseFloat(caseData.current_amount || '0')
            const additionalAmount = caseAmountUpdates.get(caseData.id) || 0
            const newAmount = currentAmount + additionalAmount

            return supabase
              .from('cases')
              .update({
                current_amount: newAmount.toString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', caseData.id)
          }
        )

        await Promise.allSettled(caseUpdatePromises)
      }
    }

    return {
      success: successCount,
      failed: errors.length,
      total: totalContributions,
      errors: errors.length > 0 ? errors : undefined,
      updatedContributions: updated,
    }
  }
}
