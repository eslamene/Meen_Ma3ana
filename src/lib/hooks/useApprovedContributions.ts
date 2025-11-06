import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

import { defaultLogger } from '@/lib/logger'

interface Contribution {
  id: string
  amount: number
  donorName: string
  message?: string
  createdAt: string
  anonymous: boolean
  status: string
  approval_status?: {
    status: string
  } | Array<{ status: string }>
}

interface UseApprovedContributionsResult {
  contributions: Contribution[]
  totalAmount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApprovedContributions(caseId: string): UseApprovedContributionsResult {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchApprovedContributions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('contributions')
        .select(`
          id,
          amount,
          created_at,
          anonymous,
          notes,
          status,
          approval_status:contribution_approval_status!contribution_id(status),
          users:donor_id(first_name, last_name, email)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      // Filter to only include approved contributions
      const approvedContributions = (data || []).filter(contribution => {
        const approvalStatus = contribution.approval_status
        // Handle both array and object formats from Supabase
        if (Array.isArray(approvalStatus)) {
          return approvalStatus.length > 0 && approvalStatus[0]?.status === 'approved'
        }
        return approvalStatus && (approvalStatus as { status: string }).status === 'approved'
      })

      // Format contributions
      const formattedContributions: Contribution[] = approvedContributions.map(contribution => {
        // Build donor name from joined user data
        const user = contribution.users
        const donorName = contribution.anonymous 
          ? 'Anonymous Donor' 
          : user && user[0].first_name && user[0].last_name
            ? `${user[0].first_name} ${user[0].last_name}`
            : user[0]?.first_name || user[0]?.last_name || user[0]?.email || 'Unknown Donor'

        return {
          id: contribution.id,
          amount: parseFloat(contribution.amount),
          donorName,
          message: contribution.notes,
          createdAt: contribution.created_at,
          anonymous: contribution.anonymous || false,
          status: contribution.status,
          approval_status: contribution.approval_status
        }
      })

      setContributions(formattedContributions)
      
      // Calculate total amount
      const total = formattedContributions.reduce((sum, contribution) => sum + contribution.amount, 0)
      setTotalAmount(total)

    } catch (err: unknown) {
      // Log both to console and structured logger for better visibility in devtools
      // Some non-Error objects (e.g., PostgrestError) don't render well in Next DevTools
      // so we also emit a plain console.error.
      console.error('Error fetching approved contributions', err)
      defaultLogger.error('Error fetching approved contributions', err)
      const message = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : 'Failed to fetch contributions'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (caseId) {
      fetchApprovedContributions()
    }
  }, [caseId])

  return {
    contributions,
    totalAmount,
    isLoading,
    error,
    refetch: fetchApprovedContributions
  }
} 