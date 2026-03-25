/**
 * Server-side storage uploads (service-role Supabase client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import { validateUpload } from '@/lib/storage/validateUpload'
import { isValidBucket, isPrivateBucket } from '@/lib/utils/storageBuckets'

export interface UploadFileParams {
  bucket: string
  fileName: string
  file: File
}

export interface UploadFileResult {
  path: string
  url: string
  bucket: string
}

export class StorageService {
  /**
   * Validate name, rules, bucket; upload bytes; return public or signed URL.
   */
  static async uploadFile(
    serviceSupabase: SupabaseClient,
    params: UploadFileParams,
    logger = defaultLogger
  ): Promise<UploadFileResult> {
    const { bucket, fileName, file } = params

    if (!file || !fileName || !bucket) {
      throw new Error('MISSING_FIELDS')
    }

    const validation = await validateUpload(bucket, file)
    if (!validation.valid) {
      throw new Error(`VALIDATION:${validation.error || 'File validation failed'}`)
    }

    const isValid = await isValidBucket(bucket)
    if (!isValid) {
      throw new Error('INVALID_BUCKET')
    }

    if (fileName.includes('..') || fileName.includes('\\') || fileName.startsWith('/')) {
      throw new Error('INVALID_FILE_NAME')
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await serviceSupabase.storage.from(bucket).upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Upload error:', error)
      throw new Error(`UPLOAD:${error.message}`)
    }

    const {
      data: { publicUrl },
    } = serviceSupabase.storage.from(bucket).getPublicUrl(data.path)

    let fileUrl: string
    const isPrivate = await isPrivateBucket(bucket)
    if (isPrivate) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await serviceSupabase.storage
          .from(bucket)
          .createSignedUrl(data.path, 31536000)

        if (!signedUrlError && signedUrlData?.signedUrl) {
          fileUrl = signedUrlData.signedUrl
          logger.info('Using signed URL for private bucket')
        } else {
          fileUrl = publicUrl
          logger.info('Using public URL (signed URL failed or bucket is public)')
        }
      } catch (signedUrlErr) {
        fileUrl = publicUrl
        logger.warn('Signed URL creation failed, using public URL:', signedUrlErr)
      }
    } else {
      fileUrl = publicUrl
    }

    return {
      path: data.path,
      url: fileUrl,
      bucket,
    }
  }

  /**
   * Remove objects from a bucket (service-role client only).
   */
  static async removePaths(
    serviceSupabase: SupabaseClient,
    bucket: string,
    paths: string[],
    logger = defaultLogger
  ): Promise<void> {
    if (!paths.length) {
      return
    }

    const valid = await isValidBucket(bucket)
    if (!valid) {
      throw new Error('INVALID_BUCKET')
    }

    for (const p of paths) {
      if (!p || p.includes('..') || p.includes('\\') || p.startsWith('/')) {
        throw new Error('INVALID_PATH')
      }
    }

    const { error } = await serviceSupabase.storage.from(bucket).remove(paths)

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Storage remove error:', error)
      throw new Error(`REMOVE:${error.message}`)
    }
  }
}
