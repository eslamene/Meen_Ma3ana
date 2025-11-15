/**
 * Upload Validation Utility
 * Validates file uploads against storage rules
 */

import { createStorageAdminClient } from './server'
import type { UploadValidationResult, StorageRule } from './types'

/**
 * Validate a file upload against storage rules
 * @param bucketName - The name of the storage bucket
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export async function validateUpload(
  bucketName: string,
  file: File
): Promise<UploadValidationResult> {
  try {
    const supabase = createStorageAdminClient()

    // Fetch storage rules for the bucket
    const { data: rule, error: ruleError } = await supabase
      .from('storage_rules')
      .select('*')
      .eq('bucket_name', bucketName)
      .maybeSingle()

    if (ruleError) {
      // If there's an error fetching rules, log it but allow upload
      // (rules are optional - if no rule exists, use defaults)
      console.warn('Error fetching storage rules:', ruleError)
    }

    // If no rule exists, use default validation (5MB, common file types)
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

    // Normalize allowed extensions to lowercase for comparison
    const normalizedAllowedExtensions = allowedExtensions.map((ext: string) => ext.toLowerCase().trim())

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`
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
        error: `File type "${fileExtension.toUpperCase()}" is not allowed. Allowed types: ${normalizedAllowedExtensions.map((e: string) => e.toUpperCase()).join(', ')}`
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error validating upload:', error)
    // On error, allow upload but log the issue
    // This prevents blocking uploads due to validation system failures
    return {
      valid: true,
      error: undefined
    }
  }
}

/**
 * Get storage rules for a bucket
 * @param bucketName - The name of the storage bucket
 * @returns Storage rule or null if not found
 */
export async function getStorageRule(bucketName: string): Promise<StorageRule | null> {
  try {
    const supabase = createStorageAdminClient()

    const { data: rule, error } = await supabase
      .from('storage_rules')
      .select('*')
      .eq('bucket_name', bucketName)
      .maybeSingle()

    if (error) {
      console.error('Error fetching storage rule:', error)
      return null
    }

    return rule
  } catch (error) {
    console.error('Error getting storage rule:', error)
    return null
  }
}

