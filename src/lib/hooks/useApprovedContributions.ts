import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
        return approvalStatus && approvalStatus.status === 'approved'
      })

      // Format contributions
      const formattedContributions: Contribution[] = approvedContributions.map(contribution => {
        // Build donor name from joined user data
        const user = contribution.users
        const donorName = contribution.anonymous 
          ? 'Anonymous Donor' 
          : user && user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.first_name || user?.last_name || user?.email || 'Unknown Donor'

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

    } catch (err) {
      console.error('Error fetching approved contributions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contributions')
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