/**
 * Centralized hook for prefetching storage rules
 * Use this hook in any component that might need file upload functionality
 */

import { useEffect, useCallback } from 'react'
import { fetchStorageRules } from '@/lib/storage/clientValidation'

/**
 * Hook to prefetch storage rules for a bucket
 * @param bucketName - The bucket name to prefetch rules for
 * @param options - Options for prefetching behavior
 */
export function usePrefetchStorageRules(
  bucketName: string | undefined | null,
  options: {
    prefetchOnMount?: boolean
    prefetchOnHover?: boolean
  } = {}
) {
  const { prefetchOnMount = true, prefetchOnHover = true } = options

  // Prefetch on mount
  useEffect(() => {
    if (prefetchOnMount && bucketName) {
      fetchStorageRules(bucketName).catch(() => {
        // Silently fail - non-critical prefetch
      })
    }
  }, [bucketName, prefetchOnMount])

  // Return a function to prefetch on demand (e.g., on hover)
  const prefetch = useCallback(() => {
    if (bucketName && prefetchOnHover) {
      fetchStorageRules(bucketName).catch(() => {
        // Silently fail - non-critical prefetch
      })
    }
  }, [bucketName, prefetchOnHover])

  return { prefetch }
}

