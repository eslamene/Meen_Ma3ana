import { useState, useEffect, useCallback } from 'react'
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

  const fetchApprovedContributions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser()
      
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
        // For public users, RLS errors are expected - try API fallback
        // Check for various RLS/permission error indicators
        const isRLSError = !user && (
          fetchError.code === 'PGRST116' || 
          fetchError.code === '42501' ||
          fetchError.message?.toLowerCase().includes('permission') || 
          fetchError.message?.toLowerCase().includes('policy') ||
          fetchError.message?.toLowerCase().includes('row-level security') ||
          fetchError.message?.toLowerCase().includes('new row violates')
        )
        
        if (isRLSError) {
          // Try to fetch from API endpoint as fallback
          try {
            const response = await fetch(`/api/cases/${caseId}/progress`)
            if (response.ok) {
              const apiData = await response.json()
              // Set total amount from API, but contributions list will be empty for public users
              setTotalAmount(apiData.approvedTotal || 0)
              setContributions([]) // Public users don't see individual contributions
              setIsLoading(false)
              setError(null) // Clear error since API fallback succeeded
              return // Successfully fetched from API, exit early
            }
          } catch (apiError) {
            // API also failed, fall through to error handling
            console.warn('API fallback also failed:', apiError)
          }
        }
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
          : user && Array.isArray(user) && user[0]?.first_name && user[0]?.last_name
            ? `${user[0].first_name} ${user[0].last_name}`
            : Array.isArray(user) && user[0]
              ? (user[0].first_name || user[0].last_name || user[0].email || 'Unknown Donor')
              : 'Unknown Donor'

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
      // Check if this is an RLS/permission error for public users
      const isRLSError = err && typeof err === 'object' && 'code' in err && (
        err.code === 'PGRST116' || 
        err.code === '42501' ||
        (typeof err === 'object' && err !== null && 'message' in err && 
         typeof (err as { message: unknown }).message === 'string' &&
         ((err as { message: string }).message.toLowerCase().includes('permission') || 
          (err as { message: string }).message.toLowerCase().includes('policy') ||
          (err as { message: string }).message.toLowerCase().includes('row-level security')))
      )
      
      // Only log non-RLS errors to avoid console noise for expected public user restrictions
      if (!isRLSError) {
        console.error('Error fetching approved contributions', err)
        defaultLogger.error('Error fetching approved contributions', err)
      } else {
        // Silently handle RLS errors - they're expected for public users
        // The API fallback should have already been attempted above
      }
      
      const message = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : 'Failed to fetch contributions'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (caseId) {
      fetchApprovedContributions()
    }
  }, [caseId, fetchApprovedContributions])

  return {
    contributions,
    totalAmount,
    isLoading,
    error,
    refetch: fetchApprovedContributions
  }
} 