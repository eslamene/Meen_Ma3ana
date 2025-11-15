/**
 * Storage Bucket Utilities
 * 
 * Provides dynamic bucket name management and validation
 * Replaces hardcoded bucket references throughout the codebase
 */

import { StorageBucketService } from '@/lib/services/storageBucketService'

/**
 * Common bucket names used in the application
 * These are fallback values if dynamic lookup fails
 */
export const BUCKET_NAMES = {
  BENEFICIARIES: 'beneficiaries',
  CASE_FILES: 'case-files',
  /** @deprecated Use CASE_FILES instead. case-images bucket is being phased out. */
  CASE_IMAGES: 'case-images',
  CONTRIBUTIONS: 'contributions',
  USERS: 'users',
  SPONSOR_APPLICATIONS: 'sponsor_applications',
  RECURRING_CONTRIBUTIONS: 'recurring_contributions'
} as const

/**
 * Cache for bucket list to avoid repeated API calls
 */
let bucketCache: { buckets: string[]; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get all available bucket names from Supabase
 * Uses cache to avoid repeated API calls
 */
export async function getAvailableBuckets(): Promise<string[]> {
  // Return cached buckets if still valid
  if (bucketCache && Date.now() - bucketCache.timestamp < CACHE_DURATION) {
    return bucketCache.buckets
  }

  try {
    const buckets = await StorageBucketService.listBuckets()
    const bucketNames = buckets.map(b => b.name)
    
    // Update cache
    bucketCache = {
      buckets: bucketNames,
      timestamp: Date.now()
    }
    
    return bucketNames
  } catch (error) {
    console.error('Failed to fetch buckets dynamically, using fallback:', error)
    // Return fallback bucket names if API call fails
    return Object.values(BUCKET_NAMES)
  }
}

/**
 * Validate if a bucket name is allowed
 * Checks against dynamically fetched buckets
 */
export async function isValidBucket(bucketName: string): Promise<boolean> {
  const availableBuckets = await getAvailableBuckets()
  return availableBuckets.includes(bucketName)
}

/**
 * Check if a bucket is private (requires authentication)
 */
export async function isPrivateBucket(bucketName: string): Promise<boolean> {
  try {
    const bucket = await StorageBucketService.getBucket(bucketName)
    return bucket ? !bucket.public : false
  } catch (error) {
    console.error('Failed to check bucket privacy:', error)
    // Default to private for security
    return true
  }
}

/**
 * Clear the bucket cache (useful after bucket creation/deletion)
 */
export function clearBucketCache(): void {
  bucketCache = null
}

/**
 * Get bucket name for a specific entity type
 * This is a convenience function for common use cases
 */
export function getBucketForEntity(entityType: 'beneficiary' | 'case' | 'user' | 'contribution' | 'sponsor' | 'recurring'): string {
  switch (entityType) {
    case 'beneficiary':
      return BUCKET_NAMES.BENEFICIARIES
    case 'case':
      return BUCKET_NAMES.CASE_FILES
    case 'user':
      return BUCKET_NAMES.USERS
    case 'contribution':
      return BUCKET_NAMES.CONTRIBUTIONS
    case 'sponsor':
      return BUCKET_NAMES.SPONSOR_APPLICATIONS
    case 'recurring':
      return BUCKET_NAMES.RECURRING_CONTRIBUTIONS
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

