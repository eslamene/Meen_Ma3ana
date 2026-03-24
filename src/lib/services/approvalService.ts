/**
 * Approval Service
 * Handles all contribution approval status-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface ApprovalStatus {
  id: string
  contribution_id: string
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged' | 'revised'
  admin_id?: string | null
  rejection_reason?: string | null
  admin_comment?: string | null
  donor_reply?: string | null
  donor_reply_date?: string | null
  payment_proof_url?: string | null
  resubmission_count: number
  created_at: string
  updated_at: string
  contributions?: unknown
  admin?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

export interface CreateApprovalStatusData {
  contribution_id: string
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged' | 'revised'
  admin_id?: string | null
  rejection_reason?: string | null
  admin_comment?: string | null
  donor_reply?: string | null
  donor_reply_date?: string | null
  payment_proof_url?: string | null
  resubmission_count?: number
}

export interface UpdateApprovalStatusData {
  status?: 'pending' | 'approved' | 'rejected' | 'acknowledged' | 'revised'
  admin_id?: string | null
  rejection_reason?: string | null
  admin_comment?: string | null
  donor_reply?: string | null
  donor_reply_date?: string | null
  payment_proof_url?: string | null
  resubmission_count?: number
}

export class ApprovalService {
  /**
   * Get approval status by contribution ID
   * @param supabase - Supabase client (server-side only)
   * @param contributionId - Contribution ID
   */
  static async getByContributionId(supabase: SupabaseClient, contributionId: string): Promise<ApprovalStatus | null> {
    const { data, error } = await supabase
      .from('contribution_approval_status')
      .select(`
        *,
        contributions:contribution_id(*),
        admin:admin_id(id, first_name, last_name, email)
      `)
      .eq('contribution_id', contributionId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching approval status:', error)
      throw new Error(`Failed to fetch approval status: ${error.message}`)
    }

    return data as ApprovalStatus | null
  }

  /**
   * Create a new approval status
   * @param supabase - Supabase client (server-side only)
   * @param data - Approval status data
   */
  static async create(supabase: SupabaseClient, data: CreateApprovalStatusData): Promise<ApprovalStatus> {
    const { data: newStatus, error } = await supabase
      .from('contribution_approval_status')
      .insert({
        contribution_id: data.contribution_id,
        status: data.status,
        admin_id: data.admin_id || null,
        rejection_reason: data.rejection_reason || null,
        admin_comment: data.admin_comment || null,
        donor_reply: data.donor_reply || null,
        donor_reply_date: data.donor_reply_date || null,
        payment_proof_url: data.payment_proof_url || null,
        resubmission_count: data.resubmission_count || 0
      })
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error creating approval status:', error)
      throw new Error(`Failed to create approval status: ${error.message}`)
    }

    return newStatus as ApprovalStatus
  }

  /**
   * Update approval status by contribution ID
   * @param supabase - Supabase client (server-side only)
   * @param contributionId - Contribution ID
   * @param data - Update data
   */
  static async updateByContributionId(
    supabase: SupabaseClient,
    contributionId: string,
    data: UpdateApprovalStatusData
  ): Promise<ApprovalStatus> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.admin_id !== undefined) {
      updateData.admin_id = data.admin_id
    }
    if (data.rejection_reason !== undefined) {
      updateData.rejection_reason = data.rejection_reason
    }
    if (data.admin_comment !== undefined) {
      updateData.admin_comment = data.admin_comment
    }
    if (data.donor_reply !== undefined) {
      updateData.donor_reply = data.donor_reply
    }
    if (data.donor_reply_date !== undefined) {
      updateData.donor_reply_date = data.donor_reply_date
    }
    if (data.payment_proof_url !== undefined) {
      updateData.payment_proof_url = data.payment_proof_url
    }
    if (data.resubmission_count !== undefined) {
      updateData.resubmission_count = data.resubmission_count
    }

    const { data: updatedStatus, error } = await supabase
      .from('contribution_approval_status')
      .update(updateData)
      .eq('contribution_id', contributionId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Approval status not found for contribution ${contributionId}`)
      }
      defaultLogger.error('Error updating approval status:', error)
      throw new Error(`Failed to update approval status: ${error.message}`)
    }

    return updatedStatus as ApprovalStatus
  }

  /**
   * Upsert (create or update) approval status
   * @param supabase - Supabase client (server-side only)
   * @param contributionId - Contribution ID
   * @param data - Approval status data
   */
  static async upsert(
    supabase: SupabaseClient,
    contributionId: string,
    data: CreateApprovalStatusData & UpdateApprovalStatusData
  ): Promise<ApprovalStatus> {
    const existing = await this.getByContributionId(supabase, contributionId)

    if (existing) {
      return await this.updateByContributionId(supabase, contributionId, data)
    } else {
      return await this.create(supabase, {
        contribution_id: contributionId,
        ...data
      })
    }
  }
}

