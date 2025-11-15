/**
 * Storage Configuration Module Types
 */

export interface StorageBucket {
  id: string
  name: string
  public: boolean
  created_at: string
  updated_at: string
  file_size_limit?: number
  allowed_mime_types?: string[]
}

export interface BucketMetadata {
  id: string
  name: string
  public: boolean
  created_at: string
  updated_at: string
  file_size_limit?: number
  allowed_mime_types?: string[]
  object_count?: number
}

export interface StorageRule {
  id: string
  bucket_name: string
  max_file_size_mb: number
  allowed_extensions: string[]
  updated_at: string
  created_at: string
}

export interface StorageRuleUpdate {
  bucket_name: string
  max_file_size_mb: number
  allowed_extensions: string[]
}

export interface UploadValidationResult {
  valid: boolean
  error?: string
}

export interface BucketListResponse {
  buckets: StorageBucket[]
}

export interface BucketDetailsResponse {
  bucket: BucketMetadata
  rule?: StorageRule
}

export interface StorageRuleResponse {
  rule: StorageRule
}

