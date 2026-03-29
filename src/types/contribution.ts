/**
 * Contribution Type Definitions
 */

/** Nested case row from Supabase `cases:case_id(...)` embeds */
export type ContributionCaseEmbed =
  | { title_en?: string | null; title_ar?: string | null; title?: string | null }
  | Array<{ title_en?: string | null; title_ar?: string | null; title?: string | null }>

export interface ContributionRow {
  id: string
  amount: string | number
  status: string
  notes?: string | null
  message?: string | null
  anonymous: boolean
  payment_method?: string | null
  created_at?: string | null
  updated_at?: string | null
  case_id?: string | null
  case_title?: string
  cases?: ContributionCaseEmbed
  donor_id?: string | null
  donor_email?: string | null
  donor_first_name?: string | null
  donor_last_name?: string | null
  donor_phone?: string | null
  proof_url?: string | null
  proof_of_payment?: string | null
  /** Flat RPC fields or Supabase embed array from `approval_status:contribution_approval_status!...` */
  approval_status?:
    | string
    | null
    | Array<{
        id?: string
        status?: string
        rejection_reason?: string | null
        admin_comment?: string | null
        donor_reply?: string | null
        donor_reply_date?: string | null
        resubmission_count?: number | null
        created_at?: string | null
        updated_at?: string | null
      }>
  approval_rejection_reason?: string | null
  approval_admin_comment?: string | null
  approval_donor_reply?: string | null
  approval_resubmission_count?: number | null
  approval_created_at?: string | null
  approval_updated_at?: string | null
}

export interface NormalizedContribution {
  // Core fields
  id: string
  amount: number
  status: string
  notes: string | null
  message: string | null
  anonymous: boolean
  payment_method: string | null

  // Timestamps
  createdAt: string | null
  updatedAt: string | null

  // Relations
  caseId: string | null
  caseTitle: string
  donorName: string
  donorId: string | null
  donorEmail: string | null
  donorFirstName: string | null
  donorLastName: string | null
  donorPhone: string | null
  proofUrl: string | null

  // Approval status
  approval_status: Array<{
    id?: string
    status: string
    rejection_reason?: string | null
    admin_comment?: string | null
    donor_reply?: string | null
    resubmission_count?: number | null
    created_at?: string | null
    updated_at?: string | null
  }>
}







