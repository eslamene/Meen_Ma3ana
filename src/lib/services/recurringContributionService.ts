/**
 * Recurring contributions for donors.
 * Server-side only; accepts Supabase client as parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface RecurringContributionListRow {
  id: string
  amount: number
  frequency: string
  status: string
  start_date: string | null
  end_date: string | null
  next_contribution_date: string | null
  total_contributions?: number
  successful_contributions?: number
  failed_contributions?: number
  payment_method: string | null
  auto_process: boolean
  notes: string | null
  case_id: string | null
  project_id: string | null
  created_at: string
  cases?: Array<{ title_en?: string; title_ar?: string }> | { title_en?: string; title_ar?: string }
  projects?: Array<{ name?: string }> | { name?: string }
}

export interface TransformedRecurringContribution {
  id: string
  amount: number
  frequency: string
  status: string
  start_date: string | null
  end_date: string | null
  next_contribution_date: string | null
  total_contributions: number
  successful_contributions: number
  failed_contributions: number
  payment_method: string | null
  auto_process: boolean
  notes: string | null
  case_id: string | null
  project_id: string | null
  created_at: string
  case_title: string | null
  project_name: string | null
}

export class RecurringContributionService {
  static async listForDonorWithCaseProject(
    supabase: SupabaseClient,
    donorId: string
  ): Promise<RecurringContributionListRow[]> {
    const { data, error } = await supabase
      .from('recurring_contributions')
      .select(
        `
        *,
        cases(title_en, title_ar),
        projects(name)
      `
      )
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching recurring contributions:', error)
      throw new Error(`Failed to fetch recurring contributions: ${error.message}`)
    }

    return (data || []) as RecurringContributionListRow[]
  }

  static transformForListResponse(rows: RecurringContributionListRow[]): TransformedRecurringContribution[] {
    return rows.map((contrib) => {
      const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
      const projectData = Array.isArray(contrib.projects) ? contrib.projects[0] : contrib.projects

      return {
        id: contrib.id,
        amount: contrib.amount,
        frequency: contrib.frequency,
        status: contrib.status,
        start_date: contrib.start_date,
        end_date: contrib.end_date,
        next_contribution_date: contrib.next_contribution_date,
        total_contributions: contrib.total_contributions || 0,
        successful_contributions: contrib.successful_contributions || 0,
        failed_contributions: contrib.failed_contributions || 0,
        payment_method: contrib.payment_method,
        auto_process: contrib.auto_process,
        notes: contrib.notes,
        case_id: contrib.case_id,
        project_id: contrib.project_id,
        created_at: contrib.created_at,
        case_title: caseData?.title_en || caseData?.title_ar || null,
        project_name: projectData?.name || null
      }
    })
  }

  static async create(
    supabase: SupabaseClient,
    donorId: string,
    payload: {
      caseId?: string | null
      projectId?: string | null
      amount: number
      frequency: string
      startDate: string
      endDate?: string | null
      nextContributionDate: string
      paymentMethod?: string | null
      autoProcess?: boolean
      notes?: string | null
    }
  ) {
    const { data, error } = await supabase
      .from('recurring_contributions')
      .insert({
        donor_id: donorId,
        case_id: payload.caseId || null,
        project_id: payload.projectId || null,
        amount: payload.amount,
        frequency: payload.frequency,
        start_date: payload.startDate,
        end_date: payload.endDate || null,
        next_contribution_date: payload.nextContributionDate,
        payment_method: payload.paymentMethod || 'bank_transfer',
        auto_process: payload.autoProcess !== undefined ? payload.autoProcess : true,
        notes: payload.notes || null,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating recurring contribution:', error)
      throw new Error(`Failed to create recurring contribution: ${error.message}`)
    }

    return data
  }

  static async getByIdForDonor(
    supabase: SupabaseClient,
    id: string,
    donorId: string
  ): Promise<{ donor_id: string; status: string } | null> {
    const { data, error } = await supabase
      .from('recurring_contributions')
      .select('donor_id, status')
      .eq('id', id)
      .single()

    if (error) {
      defaultLogger.error('Error fetching recurring contribution:', error)
      return null
    }

    if (!data || (data as { donor_id: string }).donor_id !== donorId) {
      return null
    }

    return data as { donor_id: string; status: string }
  }

  static async updateStatus(
    supabase: SupabaseClient,
    id: string,
    newStatus: string
  ) {
    const { data, error } = await supabase
      .from('recurring_contributions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating recurring contribution:', error)
      throw new Error(`Failed to update recurring contribution: ${error.message}`)
    }

    return data
  }
}
