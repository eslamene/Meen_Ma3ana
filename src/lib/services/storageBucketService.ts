import { createClient } from '@supabase/supabase-js'

import { defaultLogger as logger } from '@/lib/logger'

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
}

