/**
 * Client-side Storage Validation Utility
 * Validates files before upload using storage rules from the database
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface StorageRule {
  max_file_size_mb: number
  allowed_extensions: string[]
}

// Cache storage rules to avoid repeated API calls
const storageRulesCache = new Map<string, { rule: StorageRule | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch storage rules for a bucket (with caching)
 */
export async function fetchStorageRules(bucketName: string): Promise<StorageRule | null> {
  // Check cache first
  const cached = storageRulesCache.get(bucketName)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rule
  }

  try {
    // Don't include count for faster response (uploader doesn't need it)
    const response = await fetch(`/api/storage/buckets/${encodeURIComponent(bucketName)}?includeCount=false`)
    
    if (!response.ok) {
      // If bucket not found or error, return null to use defaults
      // Cache the null result to avoid repeated failed requests
      storageRulesCache.set(bucketName, { rule: null, timestamp: Date.now() })
      return null
    }

    const data = await response.json()
    const rule = data.rule || null
    
    // Cache the result
    storageRulesCache.set(bucketName, { rule, timestamp: Date.now() })
    
    return rule
  } catch (error) {
    console.warn('Error fetching storage rules:', error)
    // Cache null result on error to prevent repeated failed requests
    storageRulesCache.set(bucketName, { rule: null, timestamp: Date.now() })
    return null
  }
}

/**
 * Validate a file against storage rules (client-side)
 * @param file - The file to validate
 * @param rule - Storage rule from database (or null for defaults)
 * @param bucketName - Bucket name for error messages
 * @returns Validation result
 */
export function validateFileClient(
  file: File,
  rule: StorageRule | null,
  bucketName: string
): ValidationResult {
  // Default values if no rule exists
  const maxSizeMB = rule?.max_file_size_mb ?? 5
  // Default extensions matching the required MIME types
  const defaultExtensions = [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    // Documents
    'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx',
    // Videos
    'mp4', 'webm', 'ogg', 'avi',
    // Audio
    'mp3', 'wav', 'ogg', 'm4a'
  ]
  const allowedExtensions = rule?.allowed_extensions ?? defaultExtensions

  // Normalize allowed extensions to lowercase
  const normalizedAllowedExtensions = allowedExtensions.map(ext => ext.toLowerCase().trim())

  // Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${maxSizeMB}MB`
    }
  }

  // Validate file extension
  const fileName = file.name.toLowerCase()
  const fileExtension = fileName.split('.').pop()?.toLowerCase().trim()

  if (!fileExtension) {
    return {
      valid: false,
      error: 'File must have an extension'
    }
  }

  // Check if extension is in the allowed list (case-insensitive)
  if (!normalizedAllowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `File type "${fileExtension.toUpperCase()}" is not allowed. Allowed types: ${normalizedAllowedExtensions.map(e => e.toUpperCase()).join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

