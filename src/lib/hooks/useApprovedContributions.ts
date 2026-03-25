'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { defaultLogger as logger } from '@/lib/logger'

export interface Contribution {
  id: string
  amount: number
  donorName: string
  message?: string
  createdAt: string
  anonymous: boolean
  status?: string
  approval_status?: {
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
    rejection_reason?: string
    admin_comment?: string
    donor_reply?: string
    donor_reply_date?: string
    payment_proof_url?: string
    resubmission_count: number
  }
}

export interface UseApprovedContributionsReturn {
  contributions: Contribution[]
  totalAmount: number
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to fetch approved contributions for a specific case
 * @param caseId - The ID of the case to fetch contributions for
 * @returns Object containing contributions array, total amount, loading state, and error
 */
export function useApprovedContributions(caseId: string): UseApprovedContributionsReturn {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchApprovedContributions = useCallback(async () => {
    // Don't fetch if caseId is empty or invalid
    if (!caseId || caseId.trim() === '') {
      setContributions([])
      setTotalAmount(0)
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Fetch contributions for this case with approval status
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select(`
          id,
          amount,
          created_at,
          anonymous,
          notes,
          status,
          users:donor_id(
            first_name,
            last_name,
            email
          ),
          approval_status:contribution_approval_status!contribution_id(
            id,
            status,
            rejection_reason,
            admin_comment,
            donor_reply,
            donor_reply_date,
            payment_proof_url,
            resubmission_count
          )
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (contributionsError) {
        throw new Error(`Failed to fetch contributions: ${contributionsError.message}`)
      }

      // Filter to only include approved contributions
      // A contribution is approved if:
      // 1. It has an approval_status with status === 'approved', OR
      // 2. The main status field is 'approved' (fallback)
      const approvedContributions = (contributionsData || [])
        .filter((contribution: any) => {
          const approvalStatus = contribution.approval_status
          
          // Check approval_status array
          if (Array.isArray(approvalStatus) && approvalStatus.length > 0) {
            return approvalStatus[0]?.status === 'approved'
          }
          
          // Check single approval_status object
          if (approvalStatus && !Array.isArray(approvalStatus)) {
            return approvalStatus.status === 'approved'
          }
          
          // Fallback to main status field
          return contribution.status === 'approved'
        })
        .map((contribution: any) => {
          // Get donor name
          const donor = contribution.users
          let donorName = 'Anonymous'
          
          if (!contribution.anonymous && donor) {
            const firstName = donor.first_name || ''
            const lastName = donor.last_name || ''
            donorName = `${firstName} ${lastName}`.trim() || donor.email || 'Unknown Donor'
          }

          // Get approval status
          const approvalStatus = contribution.approval_status
          let approvalStatusObj = undefined
          
          if (Array.isArray(approvalStatus) && approvalStatus.length > 0) {
            approvalStatusObj = approvalStatus[0]
          } else if (approvalStatus && !Array.isArray(approvalStatus)) {
            approvalStatusObj = approvalStatus
          }

          return {
            id: contribution.id,
            amount: parseFloat(contribution.amount || '0'),
            donorName,
            message: contribution.notes || undefined,
            createdAt: contribution.created_at,
            anonymous: contribution.anonymous || false,
            status: contribution.status || 'approved',
            approval_status: approvalStatusObj ? {
              id: approvalStatusObj.id,
              status: approvalStatusObj.status,
              rejection_reason: approvalStatusObj.rejection_reason || undefined,
              admin_comment: approvalStatusObj.admin_comment || undefined,
              donor_reply: approvalStatusObj.donor_reply || undefined,
              donor_reply_date: approvalStatusObj.donor_reply_date || undefined,
              payment_proof_url: approvalStatusObj.payment_proof_url || undefined,
              resubmission_count: approvalStatusObj.resubmission_count || 0
            } : undefined
          } as Contribution
        })

      // Calculate total amount
      const total = approvedContributions.reduce((sum, contrib) => sum + contrib.amount, 0)

      setContributions(approvedContributions)
      setTotalAmount(total)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch approved contributions')
      logger.error('Error fetching approved contributions:', { error, caseId })
      setError(error)
      setContributions([])
      setTotalAmount(0)
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchApprovedContributions()
  }, [fetchApprovedContributions])

  return {
    contributions,
    totalAmount,
    isLoading,
    error
  }
}
