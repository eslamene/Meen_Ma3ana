import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

import { defaultLogger } from '@/lib/logger'
import { isValidUUID } from '@/lib/utils/uuid'

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
    // Don't fetch if caseId is not a valid UUID
    if (!isValidUUID(caseId)) {
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
              setError(null) // Clear error since API fallback succeeded
              setIsLoading(false)
              return // Successfully fetched from API, exit early
            } else {
              // API returned error, but don't throw - just set empty state
              setTotalAmount(0)
              setContributions([])
              setError(null) // Don't show error for public users
              setIsLoading(false)
              return
            }
          } catch (apiError) {
            // API also failed, but for public users we'll just set empty state
            setTotalAmount(0)
            setContributions([])
            setError(null) // Don't show error for public users
            setIsLoading(false)
            return // Exit early for RLS errors even if API fails
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
      let isRLSError = false
      
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>
        
        // Check for RLS error codes
        if ('code' in errorObj) {
          const code = errorObj.code
          isRLSError = code === 'PGRST116' || code === '42501' || code === 'PGRST301'
        }
        
        // Check for RLS-related messages
        if (!isRLSError && 'message' in errorObj && typeof errorObj.message === 'string') {
          const message = errorObj.message.toLowerCase()
          isRLSError = message.includes('permission') || 
                      message.includes('policy') ||
                      message.includes('row-level security') ||
                      message.includes('new row violates') ||
                      message.includes('insufficient privileges')
        }
        
        // Check for Supabase PostgREST errors
        if (!isRLSError && 'hint' in errorObj && typeof errorObj.hint === 'string') {
          const hint = errorObj.hint.toLowerCase()
          isRLSError = hint.includes('policy') || hint.includes('permission')
        }
      }
      
      // Only log non-RLS errors to avoid console noise for expected public user restrictions
      if (!isRLSError) {
        // Format error for better logging
        const errorMessage = err instanceof Error
          ? err.message
          : (err && typeof err === 'object' && 'message' in err)
            ? String((err as { message: unknown }).message)
            : (err && typeof err === 'object' && 'code' in err)
              ? `Error code: ${String((err as { code: unknown }).code)}`
              : 'Unknown error occurred'
        
        const errorDetails = err instanceof Error
          ? { message: err.message, name: err.name, stack: err.stack }
          : err && typeof err === 'object'
            ? { ...err }
            : { error: String(err) }
        
        console.error('Error fetching approved contributions:', errorMessage, errorDetails)
        defaultLogger.error('Error fetching approved contributions', { errorMessage, errorDetails })
      } else {
        // Silently handle RLS errors - they're expected for public users
        // The API fallback should have already been attempted above
        // Set empty state for RLS errors (public users can't see contributions)
        setTotalAmount(0)
        setContributions([])
        setError(null) // Don't show error for public users
        setIsLoading(false)
        return
      }
      
      const message = err instanceof Error
        ? err.message
        : (err && typeof err === 'object' && 'message' in err)
          ? String((err as { message: unknown }).message)
          : 'Failed to fetch contributions'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    // Only fetch if caseId is a valid UUID
    if (isValidUUID(caseId)) {
      fetchApprovedContributions()
    } else {
      // Set empty state for invalid UUIDs
      setContributions([])
      setTotalAmount(0)
      setIsLoading(false)
      setError(null)
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