import { createClient } from '@supabase/supabase-js'

import { defaultLogger as logger } from '@/lib/logger'
import type { StorageRule } from '@/lib/storage/types'

export interface StorageBucket {
  id: string
  name: string
  public: boolean
  file_size_limit?: number
  allowed_mime_types?: string[]
  created_at?: string
  updated_at?: string
}


export interface UpdateBucketData {
  public?: boolean
  file_size_limit?: number
  allowed_mime_types?: string[]
}

export class StorageBucketService {
  private static getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }

    if (!serviceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }

    return createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  /**
   * List all storage buckets
   */
  static async listBuckets(): Promise<StorageBucket[]> {
    try {
      const supabase = this.getServiceClient()
      
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        console.error('Supabase storage.listBuckets error:', {
          message: error.message
        })
        throw new Error(`Failed to list buckets: ${error.message}`)
      }

      return data || []
    } catch (error) {
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        logger.error('Error in listBuckets:', { error: { message: error.message, stack: error.stack } })
        throw error
      }
      logger.error('Unknown error in listBuckets:', { error: error })
      throw new Error(`Failed to list buckets: ${String(error)}`)
    }
  }

  /**
   * Get a specific bucket by name
   */
  static async getBucket(name: string): Promise<StorageBucket | null> {
    const buckets = await this.listBuckets()
    return buckets.find(b => b.name === name) || null
  }

  /**
   * Update bucket settings
   */
  static async updateBucket(name: string, data: UpdateBucketData): Promise<StorageBucket> {
    const supabase = this.getServiceClient()

    const updateData: { public: boolean; fileSizeLimit?: string | number | null; allowedMimeTypes?: string[] | null } = {
      public: data.public ?? false
    }
    if (data.file_size_limit !== undefined) updateData.fileSizeLimit = data.file_size_limit
    if (data.allowed_mime_types !== undefined) updateData.allowedMimeTypes = data.allowed_mime_types

    const { data: updated, error } = await supabase.storage.updateBucket(name, updateData)

    if (error) {
      throw new Error(`Failed to update bucket: ${error.message}`)
    }

    if (!updated) {
      throw new Error('Bucket update returned no data')
    }

    return updated as unknown as StorageBucket
  }


  /**
   * Create a new bucket
   */
  static async createBucket(
    name: string,
    options: {
      public?: boolean
      file_size_limit?: number
      allowed_mime_types?: string[]
    }
  ): Promise<StorageBucket> {
    const supabase = this.getServiceClient()

    const { data, error } = await supabase.storage.createBucket(name, {
      public: options.public ?? false,
      fileSizeLimit: options.file_size_limit,
      allowedMimeTypes: options.allowed_mime_types
    })

    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`)
    }

    if (!data) {
      throw new Error('Bucket creation returned no data')
    }

    return data as unknown as StorageBucket
  }

  /**
   * Delete a bucket
   */
  static async deleteBucket(name: string): Promise<void> {
    const supabase = this.getServiceClient()

    const { error } = await supabase.storage.deleteBucket(name)

    if (error) {
      throw new Error(`Failed to delete bucket: ${error.message}`)
    }
  }

  /**
   * Get storage rules for all buckets
   */
  static async getStorageRules(): Promise<StorageRule[]> {
    const supabase = this.getServiceClient()
    
    const { data, error } = await supabase
      .from('storage_rules')
      .select('*')

    if (error) {
      logger.error('Error fetching storage rules:', error)
      throw new Error(`Failed to fetch storage rules: ${error.message}`)
    }

    return (data || []) as StorageRule[]
  }

  /**
   * Get storage rule for a specific bucket
   */
  static async getStorageRule(bucketName: string): Promise<StorageRule | null> {
    const supabase = this.getServiceClient()
    
    const { data, error } = await supabase
      .from('storage_rules')
      .select('*')
      .eq('bucket_name', bucketName)
      .maybeSingle()

    if (error) {
      logger.error('Error fetching storage rule:', error)
      throw new Error(`Failed to fetch storage rule: ${error.message}`)
    }

    return (data as StorageRule) || null
  }

  /**
   * Create or update storage rule for a bucket
   */
  static async upsertStorageRule(
    bucketName: string,
    rule: {
      max_file_size_mb: number
      allowed_extensions: string[]
    }
  ): Promise<StorageRule> {
    const supabase = this.getServiceClient()

    // Normalize extensions: lowercase, trim whitespace, remove duplicates
    const normalizedExtensions = Array.from(
      new Set(
        rule.allowed_extensions
          .map(ext => ext.toLowerCase().trim())
          .filter(ext => ext.length > 0)
      )
    )

    const { data, error } = await supabase
      .from('storage_rules')
      .upsert(
        {
          bucket_name: bucketName,
          max_file_size_mb: rule.max_file_size_mb,
          allowed_extensions: normalizedExtensions
        },
        {
          onConflict: 'bucket_name'
        }
      )
      .select()
      .single()

    if (error) {
      logger.error('Error upserting storage rule:', error)
      throw new Error(`Failed to update storage rule: ${error.message}`)
    }

    if (!data) {
      throw new Error('Storage rule upsert returned no data')
    }

    return data as StorageRule
  }
}

